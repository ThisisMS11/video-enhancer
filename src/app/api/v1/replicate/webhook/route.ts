import { NextResponse } from 'next/server';
import { redisClient, CheckRedisConnection } from '@/app/api/utils/redisClient';
import { createLoggerWithLabel } from '@/app/api/utils/logger';

const logger = createLoggerWithLabel('WEBHOOK_REPLICATE');

// Define valid status types
type PredictionStatus = 'succeeded' | 'processing' | 'failed';

async function storePredictionData(predictionId: string, payload: any) {
    await redisClient.hSet(`prediction:${predictionId}`, {
        status: payload.status,
        output: JSON.stringify(payload.output),
        completed_at: payload.completed_at,
    });
    logger.info(
        `Stored prediction ${predictionId} with status ${payload.status} and output ${payload.output} in redis`
    );
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        logger.info(
            `Webhook received for prediction ${payload.id} with status ${payload.status}`
        );

        // Check Redis connection

        const redisConnected = await CheckRedisConnection(redisClient);

        if (!redisConnected) {
            logger.error('Redis connection failed');
            return NextResponse.json(
                { error: 'Redis connection failed' },
                { status: 500 }
            );
        }

        // Validate payload status
        if (
            !payload.id ||
            !['succeeded', 'processing', 'failed'].includes(payload.status)
        ) {
            logger.error(
                `Invalid payload received: ${JSON.stringify(payload)}`
            );
            return NextResponse.json(
                { error: 'Invalid payload' },
                { status: 400 }
            );
        }

        // Store prediction data regardless of status
        await storePredictionData(payload.id, payload);

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Webhook error: ${error}`);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

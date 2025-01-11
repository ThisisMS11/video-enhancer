import { NextResponse } from 'next/server';
import { redisClient, CheckRedisConnection } from '@/app/api/utils/redisClient';
import { createLoggerWithLabel } from '@/app/api/utils/logger';

const logger = createLoggerWithLabel('WEBHOOK_REPLICATE');

// Define valid status types
type PredictionStatus = 'succeeded' | 'processing' | 'failed';

async function storePredictionData(predictionId: string, payload: any) {
    try {
        if (!predictionId) {
            throw new Error('Prediction ID is required');
        }

        // Validate required payload fields
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload format');
        }

        // Prepare data with empty string fallbacks instead of null
        const data = {
            status: payload.status || 'unknown',
            output: payload.output ? JSON.stringify(payload.output) : '',
            model: payload.input?.model || '',
            resolution: payload.input?.resolution || '',
            original_file: payload.input?.video_path || '',
            created_at: payload.created_at || '',
            completed_at: payload.completed_at || '',
            predict_time: payload.metrics?.predict_time || '',
        };

        // Store in Redis with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                await redisClient.hSet(`prediction:${predictionId}`, data);
                break;
            } catch (redisError) {
                retries--;
                if (retries === 0) throw redisError;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
            }
        }

        logger.info(
            `Successfully stored prediction ${predictionId} with status ${data.status} in redis`
        );
    } catch (error) {
        logger.error(
            `Failed to store prediction data for ${predictionId}: ${error}`
        );
        throw error;
    }
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

import { NextResponse } from 'next/server';
import { redisClient, CheckRedisConnection } from '@/app/api/utils/redisClient';
import { createLoggerWithLabel } from '@/app/api/utils/logger';

const logger = createLoggerWithLabel('REPLICATE_PREDICTION');

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const redisConnected = await CheckRedisConnection(redisClient);

    if (!redisConnected) {
        logger.error(`Redis connection failed`);
        return NextResponse.json(
            { error: 'Redis connection failed' },
            { status: 500 }
        );
    }

    try {
        logger.info(`Checking prediction status ${id}`);

        if (!id) {
            logger.warn('Missing prediction ID');
            return NextResponse.json(
                { error: 'Prediction ID is required' },
                { status: 400 }
            );
        }

        // Get the prediction status from KV store
        const prediction = await redisClient.hGetAll(`prediction:${id}`);

        logger.info(`Predicton Status with id ${id} : ${prediction.status}`);

        if (!prediction) {
            logger.info(`Prediction not found, still processing ${id}`);
            return NextResponse.json({ status: 'processing' });
        }

        return NextResponse.json(prediction);
    } catch (error) {
        logger.error(`Failed to check prediction status ${id} and ${error}`);
        return NextResponse.json(
            { error: 'Failed to check status' },
            { status: 500 }
        );
    }
}

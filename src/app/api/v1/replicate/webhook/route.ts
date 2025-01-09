import { NextResponse } from 'next/server';
import { redisClient, CheckRedisConnection } from '@/app/api/utils/redisClient';
import { createLoggerWithLabel } from '@/app/api/utils/logger';

const logger = createLoggerWithLabel('WEBHOOK_REPLICATE');

export async function POST(request: Request) {
    logger.info(`Webhook received`);
    try {
        const payload = await request.json();
        logger.info(`Webhook received for prediction ${payload.id} with status ${payload.status}`);

        const redisConnected = await CheckRedisConnection(redisClient);

        if (!redisConnected) {  
            logger.error(`Redis connection failed`);
            return NextResponse.json({ error: 'Redis connection failed' }, { status: 500 });
        }

        /* Store the prediction result in redis store */
        if (payload.status === 'succeeded') {
            logger.info(`Storing prediction result in redis for prediction ${payload.id}`);
            await redisClient.hSet(
                `prediction:${payload.id}`,
                {
                    status: payload.status,
                    output: JSON.stringify(payload.output),
                    completed_at: payload.completed_at
                }
            );
        }

        logger.info(`Webhook received for prediction ${payload.id} with status ${payload.status}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Webhook error: ${error}`);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

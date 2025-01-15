import { NextResponse } from 'next/server';
import { createLoggerWithLabel } from '@/app/api/utils/logger';
import Replicate from 'replicate';

const logger = createLoggerWithLabel('CANCEL_PREDICTION');

export async function POST(request: Request) {
    const { id } = await request.json();
    logger.info(`Cancelling prediction ${id}`);

    const replicate = new Replicate({
        auth: process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN,
    });

    try {
        const res = await replicate.predictions.cancel(id);
        logger.info(`Prediction ${id} cancelled`);
        return NextResponse.json({ success: true, data: res });
    } catch (error) {
        logger.error(`Error cancelling prediction ${id}: ${error}`);
        return NextResponse.json(
            { error: 'Error cancelling prediction' },
            { status: 500 }
        );
    }
}

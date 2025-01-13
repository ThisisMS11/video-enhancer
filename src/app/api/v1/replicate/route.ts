import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import { v2 as cloudinary } from 'cloudinary';
import { createLoggerWithLabel } from '@/app/api/utils/logger';

const logger = createLoggerWithLabel('UPSCALE_REPLICATE');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
    try {
        const { videoUrl, model, resolution } = await request.json();

        logger.info(
            `Upscaling video ${videoUrl} with resolution ${resolution} and model ${model}`
        );

        if (!videoUrl || !resolution || !model) {
            logger.warn(`Video URL, resolution, and model are required`);
            return NextResponse.json(
                { error: 'Video URL, resolution, and model are required' },
                { status: 400 }
            );
        }

        const input = {
            video_path: videoUrl,
            resolution: resolution,
            model: model,
        };

        const prediction = await replicate.predictions.create({
            version:
                'c23768236472c41b7a121ee735c8073e29080c01b32907740cfada61bff75320',
            input,
            webhook: `${process.env.WEBHOOK_URL}/api/v1/replicate/webhook`,
            webhook_events_filter: ['start', 'output', 'completed'],
        });

        const latest = await replicate.predictions.get(prediction.id);

        logger.info(
            `Prediction created with id ${latest.id} and status ${latest.status}`
        );

        return NextResponse.json({
            success: true,
            id: latest.id,
            status: latest.status,
        });
    } catch (error) {
        logger.error(`API error: ${error}`);
        return NextResponse.json(
            { error: 'Failed to process video' },
            { status: 500 }
        );
    }
}

export const maxDuration = 60;

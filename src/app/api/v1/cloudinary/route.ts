import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createLoggerWithLabel } from '../../utils/logger';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logger = createLoggerWithLabel('CLOUDINARY');

/* To upload a upscaled video to cloudinary */
export async function POST(request: NextRequest) {
    const { videoUrl, type } = await request.json();

    if (!videoUrl) {
        logger.warn('Video URL is required');
        return NextResponse.json(
            { error: 'Video URL is required' },
            { status: 400 }
        );
    }

    const folder = type == 'original' ? 'original_videos' : 'enhanced_videos';

    try {
        const uploadOptions = {
            resource_type: 'video' as const,
            folder: folder,
        };

        // Apply compression options only for original videos
        if (type === 'original') {
            Object.assign(uploadOptions, {
                eager: [
                    {
                        raw_transformation: [
                            'vc_h264:main:4.0',
                            'q_auto:low',
                            'c_scale,w_640',
                            'fps_25',
                        ].join('/'),
                        format: 'mp4',
                    },
                ],
                eager_async: true,
                video_codec: 'h264',
                bit_rate: '800k',
                fps: 25,
                quality_analysis: true,
                transformation: [
                    {
                        width: 640,
                        crop: 'scale',
                        audio_codec: 'aac',
                        audio_frequency: 22050,
                    },
                ],
            });
        }

        const result = await cloudinary.uploader.upload(
            videoUrl,
            uploadOptions
        );

        logger.info(`Video uploaded to cloudinary: ${result.secure_url}`);
        return NextResponse.json({
            url: result.eager?.[0]?.secure_url || result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        logger.error(`Error uploading video to cloudinary: ${error}`);
        return NextResponse.json(
            { error: 'Failed to upload video' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createLoggerWithLabel } from '../../utils/logger';
import { currentUser } from '@clerk/nextjs/server';
import clientPromise from '@/app/api/utils/mongoClient';

const logger = createLoggerWithLabel('DB');

export async function POST(request: NextRequest) {
    try {
        logger.info('Starting to process video information storage request');

        // Validate request body exists
        if (!request.body) {
            logger.warn('Empty request body');
            return NextResponse.json(
                { error: 'Request body is required' },
                { status: 400 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            logger.warn(`Invalid JSON in request body ${JSON.stringify(e)}`);
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const {
            original_video_url,
            enhanced_video_url,
            status,
            created_at,
            ended_at,
            model,
            resolution,
            predict_time,
        } = body;

        // Validate required fields
        const requiredFields = {
            original_video_url,
            status,
            created_at,
            model,
            resolution,
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missingFields.length > 0) {
            logger.warn(`Missing required fields: ${missingFields.join(', ')}`);
            return NextResponse.json(
                {
                    error: 'Missing required fields',
                    missingFields,
                },
                { status: 400 }
            );
        }

        // Validate field types and formats
        if (
            typeof original_video_url !== 'string' ||
            !original_video_url.startsWith('http')
        ) {
            logger.warn('Invalid original_video_url format');
            return NextResponse.json(
                { error: 'Invalid original_video_url format' },
                { status: 400 }
            );
        }

        if (
            enhanced_video_url &&
            (typeof enhanced_video_url !== 'string' ||
                !enhanced_video_url.startsWith('http'))
        ) {
            logger.warn('Invalid enhanced_video_url format');
            return NextResponse.json(
                { error: 'Invalid enhanced_video_url format' },
                { status: 400 }
            );
        }

        const validStatuses = ['succeeded', 'failed'];
        if (!validStatuses.includes(status)) {
            logger.warn(`Invalid status: ${status}`);
            return NextResponse.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        const user = await currentUser();
        if (!user) {
            logger.warn('User not authenticated');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const user_id = user.id;
        logger.info(`Processing request for user: ${user_id}`);

        let client;
        try {
            client = await clientPromise;
        } catch (error) {
            logger.error(`MongoDB connection error: ${error}`);
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 503 }
            );
        }

        const db = client.db('Replicate_Videos_Upscaler');
        const collection = db.collection('replicate_processed_videos');

        const document = {
            user_id,
            original_video_url,
            enhanced_video_url,
            status,
            created_at: new Date(created_at),
            ended_at: ended_at ? new Date(ended_at) : null,
            model,
            resolution,
            predict_time,
            updated_at: new Date(),
        };

        const result = await collection.insertOne(document);

        if (!result.acknowledged) {
            logger.error('Failed to insert document into MongoDB');
            return NextResponse.json(
                { error: 'Database operation failed' },
                { status: 500 }
            );
        }

        logger.info(
            `Successfully stored video process with id: ${result.insertedId}`
        );
        return NextResponse.json({
            success: true,
            id: result.insertedId,
            message: 'Video process stored successfully',
        });
    } catch (error) {
        logger.error(`Error storing video process: ${error}`);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: 'Failed to store video information',
            },
            { status: 500 }
        );
    }
}

/* to get the information of all the video processes of a user */
export async function GET() {
    try {
        // Authenticate user
        const user = await currentUser();
        if (!user) {
            logger.warn('User not found');
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }
        const user_id = user.id;
        if (!user_id) {
            logger.error('User ID not found');
            return NextResponse.json(
                { error: 'User ID not found' },
                { status: 400 }
            );
        }
        logger.info(`Processing request for user: ${user_id}`);

        // Connect to MongoDB
        const client = await clientPromise;
        if (!client) {
            logger.error('Failed to connect to MongoDB client');
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }

        const db = client.db('Replicate_Videos_Upscaler');
        if (!db) {
            logger.error('Failed to connect to database');
            return NextResponse.json(
                { error: 'Database connection failed' },
                { status: 500 }
            );
        }
        logger.info(`Connected to MongoDB: ${db.databaseName}`);

        // Query documents with error handling
        const collection = db.collection('replicate_processed_videos');
        if (!collection) {
            logger.error('Failed to access collection');
            return NextResponse.json(
                { error: 'Database collection not found' },
                { status: 500 }
            );
        }

        try {
            const documents = await collection
                .find({ user_id })
                .sort({ created_at: -1 }) // Sort by newest first
                .limit(100) // Limit results to prevent overwhelming response
                .toArray();

            if (!documents || documents.length === 0) {
                logger.info(`No documents found for user: ${user_id}`);
                return NextResponse.json({
                    message: 'No video processes found',
                    data: [],
                });
            }

            // Validate document structure
            const validatedDocuments = documents.map((doc) => ({
                ...doc,
                created_at: doc.created_at || new Date(),
                ended_at: doc.ended_at || null,
                status: doc.status || 'unknown',
                updated_at: doc.updated_at || new Date(),
            }));

            logger.info(
                `Retrieved ${validatedDocuments.length} documents for user: ${user_id}`
            );
            return NextResponse.json({
                message: 'Successfully retrieved video processes',
                data: validatedDocuments,
            });
        } catch (queryError) {
            logger.error(`Error querying documents: ${queryError}`);
            return NextResponse.json(
                { error: 'Failed to query video information' },
                { status: 500 }
            );
        }
    } catch (error) {
        logger.error(`Error retrieving video processes: ${error}`);
        return NextResponse.json(
            { error: 'Failed to retrieve video information' },
            { status: 500 }
        );
    }
}

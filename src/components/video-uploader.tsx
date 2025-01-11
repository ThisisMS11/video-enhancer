'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Text, Upload, Wand2, XCircle, Trash2, History } from 'lucide-react';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { Progress } from '@/components/ui/progress';
import { VideoHistoryModal } from '@/components/video-history-model';

export default function VideoGenerator() {
    const [model, setModel] = useState<string>('RealESRGAN_x4plus');
    const [resolution, setResolution] = useState<string>('FHD');

    const [_predictionId, setPredictionId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [enhancedVideoUrl, setEnhancedVideoUrl] = useState<string | null>(
        null
    );
    const [uploadCareCdnUrl, setUploadCareCdnUrl] = useState<string | null>(
        null
    );
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    /* Get the prediction status */
    const pollPredictionStatus = async (id: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate/prediction?id=${id}`
            );
            const data = await response.json();

            if (!data) {
                throw new Error('No data received from prediction endpoint');
            }

            const outputUrl = data.output ? JSON.parse(data.output) : null;

            switch (data.status) {
                case 'succeeded':
                    await handlePredictionSuccess(data, outputUrl);
                    break;

                case 'failed':
                    await handlePredictionFailed(data);
                    setStatus('failed');
                    break;

                default:
                    setStatus('processing');
                    setTimeout(() => pollPredictionStatus(id), 3000);
            }
        } catch (error) {
            console.error('Polling error:', error);
            setStatus('error');
        }
    };

    /* if video is successfully processed */
    const handlePredictionSuccess = async (data: any, outputUrl: string) => {
        setEnhancedVideoUrl(outputUrl);
        setStatus('succeeded');

        const cloudinaryData = await uploadToCloudinary(outputUrl);
        const {
            original_file,
            completed_at,
            predict_time,
            model,
            resolution,
            status,
            created_at,
        } = data;

        await saveToDatabase({
            original_video_url: original_file,
            enhanced_video_url: cloudinaryData.url,
            status: status,
            created_at: created_at,
            ended_at: completed_at,
            model: model,
            resolution: resolution,
            predict_time: predict_time,
        });
    };

    /* if video is not processed */
    const handlePredictionFailed = async (data: any) => {
        setStatus('failed');
        setEnhancedVideoUrl(null);
        setPredictionId(null);
        setUploadCareCdnUrl(null);

        const {
            original_file,
            completed_at,
            model,
            resolution,
            status,
            created_at,
        } = data;

        try {
            await saveToDatabase({
                original_video_url: original_file,
                enhanced_video_url: null,
                status,
                created_at,
                completed_at,
                model,
                resolution,
                predict_time: null,
            });
        } catch (error) {
            console.error(
                'Failed to save video information to database:',
                error
            );
        }
    };

    /* for saving the enhanced video to cloudinary */
    const uploadToCloudinary = async (videoUrl: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/cloudinary/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoUrl }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.url) {
                throw new Error('Invalid response from Cloudinary API');
            }

            return data;
        } catch (error) {
            console.error('Error uploading to Cloudinary:', error);
            throw new Error('Failed to upload video to Cloudinary');
        }
    };

    /* for saving the processed video information to database */
    const saveToDatabase = async (inputData: any) => {
        try {
            if (!process.env.NEXT_PUBLIC_APP_URL) {
                throw new Error(
                    'App URL environment variable is not configured'
                );
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/db`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(inputData),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Database save failed with status: ${response.status}`
                );
            }

            const data = await response.json();
            console.log('Database save response:', data);
            return data;
        } catch (error) {
            console.error('Failed to save to database:', error);
            throw new Error('Failed to save video information to database');
        }
    };

    /* Upload the video to the server */
    const handleUpload = async (videoUrl: string | null) => {
        if (!videoUrl) {
            console.error('No video URL provided');
            setStatus('error');
            return;
        }

        if (!process.env.NEXT_PUBLIC_APP_URL) {
            console.error('App URL environment variable is not configured');
            setStatus('error');
            return;
        }

        if (!model || !resolution) {
            console.error('Model or resolution not selected');
            setStatus('error');
            return;
        }

        try {
            setStatus('uploading');
            const body = {
                videoUrl,
                model: model,
                resolution: resolution,
            };

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                }
            ).catch((error) => {
                console.error('Network error:', error);
                throw new Error('Failed to connect to server');
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Server error:', errorData);
                throw new Error(
                    `Server error: ${response.status} ${errorData.message || ''}`
                );
            }

            const data = await response.json().catch(() => {
                throw new Error('Invalid JSON response from server');
            });

            console.log('Upload response:', data);

            if (!data || !data.id) {
                throw new Error('Invalid response: missing prediction ID');
            }

            setPredictionId(data.id);
            setStatus('processing');
            pollPredictionStatus(data.id);
        } catch (error) {
            console.error('Upload error:', error);
            setStatus('error');
            throw error; // Re-throw to allow parent components to handle
        }
    };

    /* To remove the video from the state */
    const handleRemoveVideo = () => {
        setEnhancedVideoUrl(null);
        setPredictionId(null);
        setStatus('idle');
        setUploadCareCdnUrl(null);
    };

    /* Render the right side of the page Dynamically */
    const renderRightSide = () => {
        switch (status) {
            case 'uploading':
                return (
                    <div className="space-y-4  w-[65%]  flex flex-col items-center justify-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-pulse">
                            <Upload className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">
                            Uploading Video...
                        </h2>
                        <Progress value={33} className="w-[65%] mx-auto" />
                    </div>
                );
            case 'processing':
                return (
                    <div className="space-y-4  w-[65%]  flex flex-col items-center justify-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-spin">
                            <Wand2 className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">
                            Enhancing Video...
                        </h2>
                        <Progress value={66} className="w-[65%] mx-auto" />
                    </div>
                );
            case 'succeeded':
                return (
                    <div className="space-y-4  w-[65%]">
                        <video
                            className="w-full aspect-video bg-muted rounded-lg h-[100%] m-4"
                            controls
                        >
                            <source
                                src={enhancedVideoUrl || ''}
                                type="video/mp4"
                            />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            case 'failed':
                return (
                    <div className="space-y-4 w-[65%]  flex flex-col items-center justify-center">
                        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-semibold text-red-600">
                            Processing Failed
                        </h2>
                        <p className="text-muted-foreground">
                            Please try again or contact support if the issue
                            persists.
                        </p>
                    </div>
                );
            default:
                return (
                    <div className="space-y-4 w-[65%]  flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="space-y-4">
                                <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                    <Wand2 className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h2 className="text-2xl font-semibold">
                                    Ready to Enhance the Quality of Your Video
                                </h2>
                                <p className="text-muted-foreground">
                                    Upload a video and enhance its quality
                                </p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-full rounded-sm  p-4 w-[80%]  items-center">
            {/* Left Side */}
            <div className="flex-1 p-1 border-r w-[35%]  h-full">
                <Card className="h-full ">
                    <CardContent className="p-6 h-full relative">
                        <Tabs defaultValue="text" className="mb-6">
                            <TabsList className="grid w-full grid-cols-1">
                                <TabsTrigger
                                    value="text"
                                    className="flex gap-2"
                                >
                                    <Text className="w-4 h-4" />
                                    Enhance Video Quality
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="space-y-4 relative">
                            <div>
                                <h2 className="text-lg font-medium mb-3">
                                    Upload Image for Video Generation
                                </h2>
                                <Card className="border-dashed h-full">
                                    <CardContent className="flex flex-col items-center justify-center py-4 text-center">
                                        {!uploadCareCdnUrl ? (
                                            <div>
                                                <FileUploaderRegular
                                                    sourceList="local, url, camera, dropbox, gdrive"
                                                    classNameUploader="uc-light uc-red"
                                                    pubkey={
                                                        process.env
                                                            .NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
                                                        ''
                                                    }
                                                    onFileUploadSuccess={(
                                                        info
                                                    ) =>
                                                        setUploadCareCdnUrl(
                                                            info.cdnUrl
                                                        )
                                                    }
                                                    multiple={false}
                                                    className="h-48 flex items-center justify-center"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full space-y-4">
                                                <div className="relative w-full aspect-video">
                                                    <video
                                                        className="w-full h-full rounded-lg object-cover"
                                                        controls
                                                        src={uploadCareCdnUrl}
                                                    />
                                                </div>
                                                <div className="flex justify-center">
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={
                                                            handleRemoveVideo
                                                        }
                                                        className="flex items-center gap-2 w-full "
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Remove Video
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Settings  */}
                        <div className="space-y-4 absolute bottom-1 w-full left-0 p-5">
                            <div>
                                <h2 className="text-lg font-medium">Model</h2>
                                <Select
                                    defaultValue={model}
                                    onValueChange={(value) => setModel(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RealESRGAN_x4plus">
                                            RealESRGAN_x4plus
                                        </SelectItem>
                                        <SelectItem value="RealESRGAN_x4plus_anime_6B">
                                            RealESRGAN_x4plus_anime_6B
                                        </SelectItem>
                                        <SelectItem value="realesr-animevideov3">
                                            realesr-animevideov3
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-medium">
                                    Resolution
                                </h2>
                                <Select
                                    defaultValue={resolution}
                                    onValueChange={(value) =>
                                        setResolution(value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FHD">FHD</SelectItem>
                                        <SelectItem value="2k">2k</SelectItem>
                                        <SelectItem value="4k">4k</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => handleUpload(uploadCareCdnUrl)}
                                disabled={status === 'processing' || status === 'uploading'}
                            >
                                <Wand2 className="w-4 h-4 mr-2" />
                                {status === 'processing' ? 'Enhancing Video...' :
                                    status === 'uploading' ? 'Uploading Video...' :
                                        'Enhance Video'}
                            </Button>
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => setHistoryModalOpen(true)}
                            >
                                <History className="w-4 h-4 mr-2" />
                                View History
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side */}
            {renderRightSide()}

            <VideoHistoryModal
                open={historyModalOpen}
                onOpenChange={setHistoryModalOpen}
            />
        </div>
    );
}

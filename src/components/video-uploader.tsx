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
import {
    Text,
    Upload,
    Wand2,
    XCircle,
    Trash2,
    History,
    RefreshCcw,
    CheckCircle2,
    RotateCw,
} from 'lucide-react';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { Progress } from '@/components/ui/progress';
import { VideoHistoryModal } from '@/components/video-history-model';
import { videoAPI } from '@/services/api';
import { useVideoProcessing } from '@/hooks/useVideoProcessing';
import { toast } from 'sonner';

export default function VideoGenerator() {
    const {
        status,
        setStatus,
        setPredictionId,
        enhancedVideoUrl,
        setEnhancedVideoUrl,
        uploadCareCdnUrl,
        setUploadCareCdnUrl,
        handleEnhancingVideo,
    } = useVideoProcessing();

    const [model, setModel] = useState<string>('RealESRGAN_x4plus');
    const [resolution, setResolution] = useState<string>('FHD');
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(
        null
    );
    // const [cancelUrl, setCancelUrl] = useState<string | null>(null);

    /* Start the video processing */
    const handleProcessingVideo = async (videoUrl: string) => {
        if (!videoUrl) {
            console.error('No video URL provided');
            toast('Error', {
                description: 'Please upload a video',
                duration: 3000,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
            return;
        }

        setStatus('uploading');
        /* upload the video to cloudinary if not already uploaded */
        let uploadedUrl = originalVideoUrl;
        if (!originalVideoUrl) {
            try {
                const uploadResult = await videoAPI.uploadToCloudinary(
                    videoUrl,
                    'original'
                );
                if (!uploadResult?.url) {
                    throw new Error('Failed to get upload URL from Cloudinary');
                }
                uploadedUrl = uploadResult.url;
                setOriginalVideoUrl(uploadedUrl);
            } catch (error) {
                console.error(
                    'Error uploading original video to cloudinary:',
                    error
                );
                setStatus('error');
                return;
            }
        }

        // /* enhance the video */
        try {
            setStatus('processing');

            /* Adding some delay time to give cloudinary time to upload the video */
            await new Promise((resolve) => setTimeout(resolve, 10000));

            const predictionId = await handleEnhancingVideo(
                uploadedUrl,
                model,
                resolution
            );
            if (!predictionId) {
                throw new Error('No prediction ID returned');
            }
            pollPredictionStatus(predictionId);
        } catch (error) {
            console.error('Error enhancing video:', error);
            setStatus('error');
            return;
        }
    };

    /* Get the prediction status */
    const pollPredictionStatus = async (id: string, retryCount = 0) => {
        try {
            const data = await videoAPI.getPredictionStatus(id);
            console.log(data);
            const outputUrl = data.output ? JSON.parse(data.output) : null;
            // setCancelUrl(data.cancel_url);
            switch (data.status) {
                case 'succeeded':
                    await handlePredictionSuccess(data, outputUrl);
                    toast('Success', {
                        description: 'Video Enhanced Successfully',
                        duration: 3000,
                        icon: (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ),
                    });
                    break;

                case 'failed':
                    if (retryCount < 5) {
                        console.log(`Retry attempt ${retryCount + 1} of 5`);
                        setStatus('processing');
                        setTimeout(
                            () => pollPredictionStatus(id, retryCount + 1),
                            10000
                        );
                    } else {
                        console.log('Failed after 5 retry attempts');
                        toast('Failed', {
                            description:
                                'Failed to enhance video, Please try again',
                            duration: 3000,
                            icon: <XCircle className="h-4 w-4 text-red-500" />,
                        });
                        await handlePredictionFailed(data);
                        setStatus('failed');
                    }
                    break;

                default:
                    setStatus('processing');
                    setTimeout(
                        () => pollPredictionStatus(id, retryCount),
                        3000
                    );
            }
        } catch (error) {
            console.error('Polling error:', error);
            if (retryCount < 5) {
                console.log(`Retry attempt ${retryCount + 1} of 5 after error`); // Fixed incorrect retry count in message
                setTimeout(
                    () => pollPredictionStatus(id, retryCount + 1),
                    10000
                );
            } else {
                console.log('Failed after 5 retry attempts'); // Fixed incorrect retry count in message
                setStatus('error');
            }
        }
    };

    /* if video is successfully processed */
    const handlePredictionSuccess = async (data: any, outputUrl: string) => {
        try {
            if (!data || !outputUrl) {
                throw new Error('Invalid prediction data or output URL');
            }

            // Set UI state first
            setEnhancedVideoUrl(outputUrl);
            setStatus('succeeded');

            // Upload enhanced video to Cloudinary
            const cloudinaryData = await videoAPI.uploadToCloudinary(
                outputUrl,
                'enhanced'
            );
            if (!cloudinaryData?.url) {
                throw new Error(
                    'Failed to upload enhanced video to Cloudinary'
                );
            }

            // Extract required fields with validation
            const {
                original_file,
                completed_at,
                predict_time,
                model,
                resolution,
                status,
                created_at,
            } = data;

            if (!original_file || !completed_at || !created_at) {
                throw new Error('Missing required fields in prediction data');
            }

            // Save to database
            await videoAPI.saveToDatabase({
                original_video_url: original_file,
                enhanced_video_url: cloudinaryData.url,
                status: status || 'succeeded',
                created_at: created_at,
                ended_at: completed_at,
                model: model || 'unknown',
                resolution: resolution || 'unknown',
                predict_time: predict_time || null,
            });
        } catch (error) {
            console.error('Error in handlePredictionSuccess:', error);
            setStatus('error');
            setEnhancedVideoUrl(null);
            throw error;
        }
    };

    /* if video is not processed */
    const handlePredictionFailed = async (data: any) => {
        try {
            if (!data) {
                throw new Error('No prediction data provided');
            }

            // Reset UI state first
            setStatus('failed');
            setEnhancedVideoUrl(null);
            setPredictionId(null);

            // Extract and validate required fields
            const {
                original_file,
                completed_at,
                model,
                resolution,
                status,
                created_at,
            } = data;

            if (!original_file || !completed_at || !created_at) {
                throw new Error('Missing required fields in prediction data');
            }

            // Save failed prediction to database
            await videoAPI.saveToDatabase({
                original_video_url: original_file,
                enhanced_video_url: null,
                status: status || 'failed',
                created_at: created_at,
                completed_at: completed_at,
                model: model || 'unknown',
                resolution: resolution || 'unknown',
                predict_time: null,
            });
        } catch (error) {
            console.error('Error in handlePredictionFailed:', error);
            // Ensure UI shows failed state even if database save fails
            setStatus('failed');
            setEnhancedVideoUrl(null);
            setPredictionId(null);
            throw error;
        }
    };

    // /*  for canceling the processing */
    // const handleCancelProcessing = async () => {
    //     if (cancelUrl) {
    //         try {
    //             const response = await fetch(cancelUrl, {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'Authorization': `Bearer ${process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN}`,
    //                 },
    //             });
    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }
    //             const data = await response.json();
    //             console.log(data);
    //             setStatus('default');
    //             setEnhancedVideoUrl(null);
    //             setPredictionId(null);
    //             setCancelUrl(null);
    //         } catch (error) {
    //             console.error('Error canceling processing:', error);
    //         }
    //     }
    // };

    /* To remove the video from the state */
    const handleRemoveVideo = () => {
        setEnhancedVideoUrl(null);
        setPredictionId(null);
        setStatus('default');
        setUploadCareCdnUrl(null);
        setOriginalVideoUrl(null);
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
                        {/* <Button
                            variant="outline"
                            onClick={handleCancelProcessing}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel Processing
                        </Button> */}
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
                        <Button
                            variant="outline"
                            onClick={() =>
                                handleProcessingVideo(uploadCareCdnUrl || '')
                            }
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Retry
                        </Button>
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
                                                    ) => {
                                                        setUploadCareCdnUrl(
                                                            info.cdnUrl
                                                        );
                                                    }}
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
                                onClick={() =>
                                    handleProcessingVideo(
                                        uploadCareCdnUrl || ''
                                    )
                                }
                                disabled={['uploading', 'processing'].includes(
                                    status
                                )}
                            >
                                {/* Icon based on status */}
                                {[
                                    'processing',
                                    'uploading',
                                    'default',
                                ].includes(status) && (
                                    <Wand2 className="w-4 h-4 mr-2" />
                                )}
                                {status === 'failed' && (
                                    <RotateCw className="w-4 h-4 mr-2" />
                                )}

                                {/* Button text based on status */}
                                {{
                                    default: 'Enhance Video',
                                    uploading: 'Uploading Video...',
                                    processing: 'Enhancing Video...',
                                    failed: 'Retry...',
                                    succeeded: 'Enhance Video',
                                }[status] || 'Enhance Video'}
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

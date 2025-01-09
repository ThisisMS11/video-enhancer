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
import { Text, Upload, Wand2, XCircle } from 'lucide-react';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { Progress } from '@/components/ui/progress';

export default function VideoGenerator() {
    const [model, setModel] = useState<string>('RealESRGAN_x4plus');
    const [resolution, setResolution] = useState<string>('FHD');

    const [predictionId, setPredictionId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('idle');
    const [enhancedVideoUrl, setEnhancedVideoUrl] = useState<string | null>(
        null
    );
    const [uploadCareCdnUrl, setUploadCareCdnUrl] = useState<string | null>(
        null
    );

    /* Get the prediction status */
    const pollPredictionStatus = async (id: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/replicate/prediction?id=${id}`
            );
            const data = await response.json();

            console.log(`pollPredictionStatus: ${data}`);

            if (data.status === 'succeeded') {
                setStatus('completed');
                setEnhancedVideoUrl(data.output);
            } else if (data.status === 'failed') {
                setStatus('error');
            } else {
                // Continue polling if still processing
                setTimeout(() => pollPredictionStatus(id), 1000);
            }
        } catch (error) {
            console.error('Polling error:', error);
            setStatus('error');
        }
    };

    /* Upload the video to the server */
    const handleUpload = async (videoUrl: string | null) => {
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
            );

            const data = await response.json();
            console.log(`handleUpload: ${data}`);
            if (data.id) {
                setPredictionId(data.id);
                setStatus('processing');
                pollPredictionStatus(data.id);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatus('error');
        }
    };

    const renderRightSide = () => {
        switch (status) {
            case 'uploading':
                return (
                    <div className="space-y-4">
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-pulse">
                            <Upload className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">
                            Uploading Video...
                        </h2>
                        <Progress value={33} className="w-[60%] mx-auto" />
                    </div>
                );
            case 'processing':
                return (
                    <div className="space-y-4">
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center animate-spin">
                            <Wand2 className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold">
                            Enhancing Video...
                        </h2>
                        <Progress value={66} className="w-[60%] mx-auto" />
                    </div>
                );
            case 'completed':
                return (
                    <div className="space-y-4">
                        <video
                            className="w-full aspect-video bg-muted rounded-lg"
                            controls
                        >
                            <source
                                src={enhancedVideoUrl || ''}
                                type="video/mp4"
                            />
                            Your browser does not support the video tag.
                        </video>
                        <p className="text-sm text-green-600">
                            Video enhancement completed!
                        </p>
                    </div>
                );
            case 'error':
                return (
                    <div className="space-y-4">
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
                    <div className="flex-1 p-6">
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
        <div className="flex h-[80%]  rounded-sm  p-4">
            {/* Left Side */}
            <div className="flex-1 p-1 border-r">
                <Card>
                    <CardContent className="p-6">
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

                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-medium mb-3">
                                    Upload Image for Video Generation
                                </h2>
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <div>
                                            <FileUploaderRegular
                                                sourceList="local, url, camera, dropbox, gdrive"
                                                classNameUploader="uc-light uc-red"
                                                pubkey={
                                                    process.env
                                                        .NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY ||
                                                    ''
                                                }
                                                onFileUploadSuccess={(info) =>
                                                    setUploadCareCdnUrl(
                                                        info.cdnUrl
                                                    )
                                                }
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-2">
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
                                        <SelectItem value="standard">
                                            Standard
                                        </SelectItem>
                                        <SelectItem value="premium">
                                            Premium
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
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
                                        <SelectItem value="standard">
                                            Standard
                                        </SelectItem>
                                        <SelectItem value="premium">
                                            Premium
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => handleUpload(uploadCareCdnUrl)}
                            >
                                <Wand2 className="w-4 h-4 mr-2" />
                                Enhance Video
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side */}
            {renderRightSide()}
        </div>
    );
}

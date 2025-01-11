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
import { Text, Upload, Wand2, XCircle, Trash2 } from 'lucide-react';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { Progress } from '@/components/ui/progress';

export default function VideoGenerator() {
    const [model, setModel] = useState<string>('RealESRGAN_x4plus');
    const [resolution, setResolution] = useState<string>('FHD');

    const [predictionId, setPredictionId] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('succeeded');
    const [enhancedVideoUrl, setEnhancedVideoUrl] = useState<string | null>(
        'https://replicate.delivery/yhqm/jXXxx6p34T6YE1M1vAhQd3HfW4Ubh6a98OIkdALzXS2zueDUA/tmpennu1a2nar5oftxwzhertkxi6u3w_out.mp4'
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

            console.log(`pollPredictionStatus:`);
            console.log(JSON.stringify(data));

            if (data) {
                // Parse the output string to get the clean URL
                const outputUrl = data.output ? JSON.parse(data.output) : null;
                console.log(`output : ${outputUrl}  status : ${data.status}`);
            }

            if (data.status === 'succeeded') {
                setStatus('succeeded');
                // Parse the output string to get the clean URL
                const outputUrl = JSON.parse(data.output);
                setEnhancedVideoUrl(outputUrl);
            } else if (data.status === 'failed') {
                setStatus('failed');
            } else {
                // Continue polling if still processing
                setStatus('processing');
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

    const handleRemoveVideo = () => {
        setUploadCareCdnUrl(null);
    };

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

                <Card className='h-full '>

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
                                                    pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ''}
                                                    onFileUploadSuccess={(info) => setUploadCareCdnUrl(info.cdnUrl)}
                                                    multiple={false}
                                                    className='h-48 flex items-center justify-center'
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
                                                        onClick={handleRemoveVideo}
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
                        <div className="space-y-4 absolute bottom-10 w-full left-0 p-5">
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

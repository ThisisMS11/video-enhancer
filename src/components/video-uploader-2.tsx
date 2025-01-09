'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Card,
    CardContent,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ImageIcon, Text, Upload, Wand2 } from 'lucide-react'
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';

export default function VideoGenerator() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [model, setModel] = useState<string>('RealESRGAN_x4plus');
    const [resolution, setResolution] = useState<string>('FHD');

    const handleUpload = async (fileInfo: any) => {
        try {
            // Get the file from Uploadcare
            const body = {
                videoUrl: fileInfo.cdnUrl,
                model: model,
                resolution: resolution,
            }

            const response = await fetch('http://localhost:3000/api/v1/replicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Upload error:', error);
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
                                <TabsTrigger value="text" className="flex gap-2">
                                    <Text className="w-4 h-4" />
                                    Enhance Video Quality
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-medium mb-3">Upload Image for Video Generation</h2>
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <div>
                                            <FileUploaderRegular
                                                sourceList="local, url, camera, dropbox, gdrive"
                                                classNameUploader="uc-light uc-red"
                                                pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ''}
                                                onFileUploadSuccess={(info) => handleUpload(info)}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-lg font-medium">Model</h2>
                                <Select defaultValue={model} onValueChange={(value) => setModel(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RealESRGAN_x4plus">RealESRGAN_x4plus</SelectItem>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-lg font-medium">Resolution</h2>
                                <Select defaultValue={resolution} onValueChange={(value) => setResolution(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FHD">FHD</SelectItem>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>


                            <Button className="w-full" size="lg">
                                <Wand2 className="w-4 h-4 mr-2" />
                                Enhance Video
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side */}
            <div className="flex-1 p-6">
                <div className="flex flex-col items-center justify-center h-full text-center">
                    {selectedFile ? (
                        <div className="space-y-4">
                            <video className="w-full aspect-video bg-muted rounded-lg" controls>
                                <source src="#" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            <p className="text-sm text-muted-foreground">
                                Video will appear here after generation
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                <Wand2 className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h2 className="text-2xl font-semibold">Ready to Create Your Video</h2>
                            <p className="text-muted-foreground">
                                Upload an image and describe how you want it to animate
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

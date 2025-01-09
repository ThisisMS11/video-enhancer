'use client';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';

function VideoUploader() {
    const handleUpload = async (fileInfo: any) => {
        try {
            // Get the file from Uploadcare
            const response = await fetch(fileInfo.cdnUrl);
            const blob = await response.blob();

            // Create form data for Cloudinary upload
            const formData = new FormData();
            formData.append('file', blob);
            formData.append(
                'upload_preset',
                process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''
            );

            // Upload to Cloudinary
            const cloudinaryResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );
            const cloudinaryData = await cloudinaryResponse.json();

            // Start Replicate processing
            const replicateResponse = await fetch('/api/replicate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoUrl: cloudinaryData.secure_url,
                }),
            });

            // Handle the response (you might want to show a loading state or message)
            console.log('Processing started:', await replicateResponse.json());
        } catch (error) {
            console.error('Upload error:', error);
        }
    };

    return (
        <div>
            <FileUploaderRegular
                sourceList="local, url, camera, dropbox, gdrive"
                classNameUploader="uc-light uc-red"
                pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ''}
                onFileUploadSuccess={(info) => handleUpload(info)}
            />
        </div>
    );
}

export default VideoUploader;

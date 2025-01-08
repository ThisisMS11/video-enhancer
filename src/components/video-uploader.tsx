'use client'
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';

function VideoUploader() {
    return (
        <div>
            <FileUploaderRegular
                sourceList="local, url, camera, dropbox, gdrive"
                classNameUploader="uc-light uc-red"
                pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || ''}
            />
        </div>
    );
}

export default VideoUploader;
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface VideoProcess {
    _id: string;
    original_video_url: string;
    enhanced_video_url: string;
    status: string;
    created_at: string;
    ended_at: string;
    model: string;
    resolution: string;
    predict_time: string;
}

interface VideoHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function VideoHistoryModal({
    open,
    onOpenChange,
}: VideoHistoryModalProps) {
    const [history, setHistory] = useState<VideoProcess[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetchHistory();
        }
    }, [open]);

    const fetchHistory = async () => {
        try {
            const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/db`;
            const response = await fetch(url);
            const result = await response.json();
            setHistory(result.data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusStyles = {
            succeeded: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            processing: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
        };

        return (
            <Badge
                variant="outline"
                className={statusStyles[status as keyof typeof statusStyles]}
            >
                {status}
            </Badge>
        );
    };

    const formatDuration = (predictTime: string) => {
        const seconds = parseFloat(predictTime);
        return `${seconds.toFixed(1)}s`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Video Enhancement History</DialogTitle>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead>Resolution</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Predict Time</TableHead>
                                <TableHead>Original Video</TableHead>
                                <TableHead>Enhanced Video</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history &&
                                history.map((process) => (
                                    <TableRow key={process._id}>
                                        <TableCell>
                                            {format(
                                                new Date(process.created_at),
                                                'PPp'
                                            )}
                                        </TableCell>
                                        <TableCell>{process.model}</TableCell>
                                        <TableCell>
                                            {process.resolution}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(process.status)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(
                                                process.predict_time
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <a
                                                    href={
                                                        process.original_video_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    Original Video
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <a
                                                    href={
                                                        process.enhanced_video_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    Enhanced Video
                                                </a>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}

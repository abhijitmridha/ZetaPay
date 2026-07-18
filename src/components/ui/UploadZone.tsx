'use client';

import { ReactNode } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UploadZoneProps {
  isUploaded: boolean;
  isUploading: boolean;
  onUpload: () => void;
  onReset: () => void;
  children?: ReactNode;
  title?: string;
  description?: string;
}

export function UploadZone({
  isUploaded,
  isUploading,
  onUpload,
  onReset,
  children,
  title = 'Upload CSV',
  description = 'Drag and drop or click to upload',
}: UploadZoneProps) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        isUploaded
          ? 'border-emerald-500 bg-emerald-50/50'
          : 'border-slate-200 bg-white hover:border-emerald-500'
      }`}
    >
      {isUploaded ? (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-emerald-600" />
          <div>
            <h3 className="text-lg font-semibold text-emerald-600">Upload Successful!</h3>
            <p className="text-sm text-slate-500">{children || 'File uploaded successfully'}</p>
          </div>
          <Button variant="ghost" onClick={onReset}>
            Upload another file
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-emerald-50 p-4">
            <Upload className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <Button onClick={onUpload} loading={isUploading}>
            Choose File
          </Button>
          <p className="text-xs text-slate-500">CSV format: Name, Wallet Address, Salary</p>
        </div>
      )}
    </div>
  );
}

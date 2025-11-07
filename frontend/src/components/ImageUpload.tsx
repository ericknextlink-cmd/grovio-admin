'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, Link, FileImage, Loader2 } from 'lucide-react'
import { cn, validateImageUrl } from '@/lib/utils'
import { uploadImage, isLocalImage } from '@/lib/upload'
import Image from 'next/image'

interface ImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
  folder?: 'products' | 'categories'
}

export default function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 10,
  className,
  folder = 'products'
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addImage = useCallback((newImage: string) => {
    if (images.length >= maxImages) return
    
    const validatedImage = validateImageUrl(newImage)
    if (!images.includes(validatedImage)) {
      onImagesChange([...images, validatedImage])
    }
  }, [images, maxImages, onImagesChange])

  const removeImage = useCallback((index: number) => {
    onImagesChange(images.filter((_, i) => i !== index))
  }, [images, onImagesChange])

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return
    
    setIsUploading(true)
    const uploadPromises: Promise<void>[] = []
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const promise = new Promise<void>((resolve) => {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const result = e.target?.result as string
            if (result) {
              // Upload immediately and add the uploaded URL
              try {
                const uploadResult = await uploadImage(result, folder)
                if (uploadResult.success && uploadResult.url) {
                  addImage(uploadResult.url)
                } else {
                  console.error('Upload failed:', uploadResult.error)
                }
              } catch (error) {
                console.error('Upload error:', error)
              }
            }
            resolve()
          }
          reader.readAsDataURL(file)
        })
        uploadPromises.push(promise)
      }
    })
    
    await Promise.all(uploadPromises)
    setIsUploading(false)
  }, [addImage, folder])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  const handleUrlSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event from bubbling to parent form
    if (!urlInput.trim()) return

    const url = urlInput.trim()
    
    // For HTTP/HTTPS URLs, add them directly (already uploaded)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      addImage(url)
      setUrlInput('')
      setShowUrlInput(false)
      return
    }

    // For base64 or local images, upload them first
    if (isLocalImage(url)) {
      setIsUploading(true)
      try {
        const result = await uploadImage(url, folder)
        if (result.success && result.url) {
          addImage(result.url) // Add the uploaded URL
          setUrlInput('')
          setShowUrlInput(false)
        } else {
          console.error('Upload failed:', result.error)
          alert(result.error || 'Failed to upload image')
        }
      } catch (error) {
        console.error('Upload error:', error)
        alert('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    } else {
      // For other formats, just add directly
      addImage(url)
      setUrlInput('')
      setShowUrlInput(false)
    }
  }, [urlInput, addImage, folder])

  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200",
          isDragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          {isUploading ? (
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          ) : (
            <Upload className={cn(
              "mx-auto h-12 w-12 transition-colors",
              isDragOver ? "text-blue-500" : "text-gray-400"
            )} />
          )}
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isUploading ? "Uploading..." : isDragOver ? "Drop images here" : "Upload Images"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUploading ? "Please wait while images are being uploaded" : "Drag & drop images, or click to browse"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // Prevent button click from bubbling to parent form
                openFileSelector()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              <FileImage className="h-4 w-4" />
              Select from Computer
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // Prevent button click from bubbling to parent form
                setShowUrlInput(!showUrlInput)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              <Link className="h-4 w-4" />
              Add URL
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <form onSubmit={handleUrlSubmit} className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation() // Prevent Enter key from submitting parent form
                }
              }}
            />
            <button
              type="submit"
              onClick={(e) => e.stopPropagation()} // Prevent button click from bubbling
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // Prevent button click from bubbling
                setShowUrlInput(false)
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: Enter a public image URL or base64 data URL. Local images will be previewed only.
          </p>
        </form>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Image Previews ({images.length}/{maxImages})
            </h3>
            {images.length >= maxImages && (
              <span className="text-sm text-red-500">
                Maximum {maxImages} images reached
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <Image
                    src={image}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                    width={100}
                    height={100}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNkMyMy4zMTM3IDI2IDI2IDIzLjMxMzcgMjYgMjBDMjYgMTYuNjg2MyAyMy4zMTM3IDE0IDIwIDE0QzE2LjY4NjMgMTQgMTQgMTYuNjg2MyAxNCAyMEMxNCAyMy4zMTM3IDE2LjY4NjMgMjYgMjAgMjZaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0yNiAxNkMyNiAxOC4yMDkxIDI0LjIwOTEgMjAgMjIgMjBDMTkuNzkwOSAyMCAxOCAxOC4yMDkxIDE4IDE2QzE4IDEzLjc5MDkgMTkuNzkwOSAxMiAyMiAxMkMyNC4yMDkxIDEyIDI2IDEzLjc5MDkgMjYgMTZaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPgo='
                    }}
                  />
                </div>
                
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
                
                {/* Image info */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {image.includes('blob:') ? 'Local Image' : 'URL Image'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

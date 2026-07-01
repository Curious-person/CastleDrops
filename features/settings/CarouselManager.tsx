"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Upload,
  ImagePlus,
  RefreshCw,
  Save,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllCarouselImages,
  uploadCarouselImage,
  deleteCarouselImage,
  reorderCarouselImages,
  type CarouselImage,
} from "@/app/actions/carousel";
import { format } from "date-fns";

const MIN_IMAGES = 2;
const MAX_IMAGES = 5;

// ─── Sortable Card Component ──────────────────────────────────────────────────

interface SortableCardProps {
  image: CarouselImage;
  index: number;
  canDelete: boolean;
  onDelete: (image: CarouselImage) => void;
}

function SortableCard({ image, index, canDelete, onDelete }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
        isDragging
          ? "border-[#2FA9D9] bg-sky-50/50"
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Index Badge */}
      <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-xs font-bold text-sky-700 shrink-0">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-gray-100 shrink-0">
        <Image
          src={image.cloudinary_url}
          alt={`Carousel slide ${index + 1}`}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          Slide {index + 1}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {image.updated_at
            ? `Updated ${format(new Date(image.updated_at), "MMM d, yyyy")}`
            : image.created_at
            ? `Created ${format(new Date(image.created_at), "MMM d, yyyy")}`
            : "—"}
        </p>
      </div>

      {/* Delete */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(image)}
        disabled={!canDelete}
        className={`shrink-0 h-8 w-8 ${
          canDelete
            ? "text-gray-400 hover:text-rose-600 hover:bg-rose-50/50"
            : "text-gray-200 cursor-not-allowed"
        }`}
        title={canDelete ? "Delete image" : `Minimum ${MIN_IMAGES} images required`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CarouselManager() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarouselImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load images
  const loadImages = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getAllCarouselImages();
      setImages(data);
    } catch {
      setErrorMessage("Failed to load carousel images.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Flash message helper
  const flash = (
    setter: typeof setSuccessMessage | typeof setErrorMessage,
    msg: string,
    ms = 4000
  ) => {
    setter(msg);
    setTimeout(() => setter(null), ms);
  };

  // ── Drag End ──
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setHasOrderChanged(true);
  }

  // ── Save Order ──
  async function handleSaveOrder() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const orderedIds = images.map((i) => i.id);
    const result = await reorderCarouselImages(orderedIds);

    if (result.success) {
      setHasOrderChanged(false);
      flash(setSuccessMessage, "Carousel order saved successfully!");
      await loadImages();
    } else {
      flash(setErrorMessage, result.error || "Failed to save order.");
    }
    setIsSaving(false);
  }

  // ── Upload ──
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      if (images.length >= MAX_IMAGES) {
        flash(setErrorMessage, `Maximum of ${MAX_IMAGES} images allowed.`);
        return;
      }

      setIsUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const file = acceptedFiles[0];
      const fd = new FormData();
      fd.append("file", file);

      const result = await uploadCarouselImage(fd);

      if (result.success) {
        flash(setSuccessMessage, "Image uploaded successfully!");
        await loadImages();
        setHasOrderChanged(false);
      } else {
        flash(setErrorMessage, result.error || "Failed to upload image.");
      }
      setIsUploading(false);
    },
    [images.length, loadImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: isUploading || images.length >= MAX_IMAGES,
  });

  // ── Delete ──
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await deleteCarouselImage(
      deleteTarget.id,
      deleteTarget.cloudinary_public_id
    );

    if (result.success) {
      setDeleteTarget(null);
      flash(setSuccessMessage, "Image deleted successfully!");
      await loadImages();
      setHasOrderChanged(false);
    } else {
      flash(setErrorMessage, result.error || "Failed to delete image.");
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  }

  const canDelete = images.length > MIN_IMAGES;
  const canUpload = images.length < MAX_IMAGES;

  // ── Render ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-6 h-6 text-[#2FA9D9] animate-spin" />
        <p className="text-sm text-gray-500 mt-3">Loading carousel images...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-[#2FA9D9]" />
          Login Carousel
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage the images displayed on the login page carousel. Drag to reorder.
        </p>
      </div>
      <Separator className="bg-gray-100" />

      {/* Status Banners */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-start gap-3 transition-all duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-start gap-3 transition-all duration-300">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs">{errorMessage}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex gap-2.5 text-xs text-sky-800">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <p>
          <strong>Limits:</strong> Between {MIN_IMAGES} and {MAX_IMAGES} carousel
          images are required. Currently {images.length} of {MAX_IMAGES}.
        </p>
      </div>

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {images.map((image, index) => (
              <SortableCard
                key={image.id}
                image={image}
                index={index}
                canDelete={canDelete}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Save Order Button */}
      {hasOrderChanged && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="bg-[#2FA9D9] hover:bg-[#2195c0] text-white w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving Order...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Order
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Dropzone */}
      {canUpload && (
        <>
          <Separator className="bg-gray-100" />
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[#2FA9D9] bg-sky-50/50"
                : "border-gray-200 hover:border-gray-300 bg-gray-50/30"
            } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <>
                  <RefreshCw className="w-8 h-8 text-[#2FA9D9] animate-spin" />
                  <p className="text-sm font-medium text-gray-600">
                    Uploading to Cloudinary...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">
                    {isDragActive
                      ? "Drop image here..."
                      : "Drag & drop an image, or click to browse"}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    JPG, PNG or WEBP. Max 5MB.
                  </p>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Delete Carousel Image
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the image from Cloudinary and the
              login carousel. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="flex justify-center py-2">
              <div className="relative w-40 h-24 rounded-lg overflow-hidden border border-gray-100">
                <Image
                  src={deleteTarget.cloudinary_url}
                  alt="Image to delete"
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white w-full sm:w-auto"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

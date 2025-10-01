"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast({ title, description, variant }: ToastProps) {
  if (variant === "destructive") {
    sonnerToast.error(title, {
      description,
    })
  } else {
    sonnerToast.success(title, {
      description,
    })
  }
}

export function useToast() {
  return {
    toast,
  }
}
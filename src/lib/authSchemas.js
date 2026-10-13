import { z } from 'zod'

const MAX_PDF_SIZE = 5 * 1024 * 1024

const createPdfSchema = (v) => z
  .any()
  .refine((file) => file instanceof File, v.fileRequired)
  .refine((file) => !file || file.type === 'application/pdf', v.pdfOnly)
  .refine((file) => !file || file.size <= MAX_PDF_SIZE, v.fileTooLarge)

export const createLoginSchema = (v) => z.object({
  email: z.string().min(1, v.emailRequired).email(v.emailInvalid),
  password: z.string().min(8, v.passwordMin),
})

export const createRegisterSchema = (v) => z
  .object({
    fullName: z.string().min(3, v.nameMin),
    email: z.string().min(1, v.emailRequired).email(v.emailInvalid),
    phone: z.string().min(8, v.phoneInvalid).max(20, v.phoneInvalid).regex(/^[0-9+\-\s()]+$/, v.phoneInvalid),
    companyName: z.string().min(2, v.companyRequired),
    companyAddress: z.string().min(5, v.addressRequired),
    taxNumber: z.string().min(3, v.taxRequired),
    verificationPdf: createPdfSchema(v),
    password: z.string().min(8, v.passwordMin).regex(/[A-Z]/, v.upper).regex(/[a-z]/, v.lower).regex(/[0-9]/, v.number),
    confirmPassword: z.string().min(1, v.confirmRequired),
    acceptTerms: z.boolean().refine(Boolean, v.termsRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: v.passwordMismatch,
  })

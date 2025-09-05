/**
 * Validation utilities
 */

import type { CellPosition } from '@/types/data-display-edit'

/**
 * Validate cell value based on rules
 * @param value - Cell value to validate
 * @param rules - Validation rules
 * @returns Validation result
 */
export const validateCellValue = (
  value: string,
  rules: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: string) => boolean
  }
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // Required validation
  if (rules.required && (!value || value.trim() === '')) {
    errors.push('値は必須です')
  }
  
  // Length validations
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`最小長は${rules.minLength}文字です`)
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`最大長は${rules.maxLength}文字です`)
  }
  
  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push('形式が正しくありません')
  }
  
  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    errors.push('カスタム検証に失敗しました')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate cell position
 * @param position - Cell position to validate
 * @param dimensions - Data dimensions
 * @returns True if position is valid
 */
export const validateCellPosition = (
  position: CellPosition,
  dimensions: { rows: number; cols: number }
): boolean => {
  return (
    typeof position.row === 'number' &&
    typeof position.col === 'number' &&
    position.row >= 0 &&
    position.row < dimensions.rows &&
    position.col >= 0 &&
    position.col < dimensions.cols &&
    Number.isInteger(position.row) &&
    Number.isInteger(position.col)
  )
}

/**
 * Validate 2D array data structure
 * @param data - Data to validate
 * @returns True if data structure is valid
 */
export const validateDataStructure = (data: any): data is string[][] => {
  if (!Array.isArray(data)) {
    return false
  }
  
  return data.every(row => Array.isArray(row) && row.every(cell => typeof cell === 'string'))
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\-\+\(\)\s]+$/,
  number: /^\d+(\.\d+)?$/,
  integer: /^\d+$/,
  url: /^https?:\/\/.+/,
  date: /^\d{4}-\d{2}-\d{2}$/
} as const

/**
 * Get validation error message for pattern
 * @param pattern - Validation pattern key
 * @returns Error message
 */
export const getValidationErrorMessage = (pattern: keyof typeof ValidationPatterns): string => {
  const messages = {
    email: '有効なメールアドレスを入力してください',
    phone: '有効な電話番号を入力してください',
    number: '数値を入力してください',
    integer: '整数を入力してください',
    url: '有効なURLを入力してください',
    date: '有効な日付（YYYY-MM-DD）を入力してください'
  }
  
  return messages[pattern] || '形式が正しくありません'
}

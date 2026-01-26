import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

// Validated Input Component
export function ValidatedInput({
  value,
  onChange,
  validate,
  label,
  placeholder,
  type = 'text',
  required = false,
  showValidation = true,
  className = '',
  inputClassName = '',
  ...props
}) {
  const [touched, setTouched] = useState(false)
  const [validation, setValidation] = useState({ valid: true, message: '' })

  useEffect(() => {
    if (touched || value) {
      const result = validateValue(value)
      setValidation(result)
    }
  }, [value, touched])

  const validateValue = (val) => {
    if (required && (!val || val.trim() === '')) {
      return { valid: false, message: 'This field is required' }
    }
    if (validate) {
      const customResult = validate(val)
      if (typeof customResult === 'string') {
        return { valid: false, message: customResult }
      }
      if (customResult === false) {
        return { valid: false, message: 'Invalid value' }
      }
    }
    return { valid: true, message: '' }
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const showStatus = showValidation && touched && value

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2 rounded-lg border bg-gray-800/50 text-gray-200
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${showStatus && !validation.valid 
              ? 'border-red-500 focus:ring-red-500/30' 
              : showStatus && validation.valid
                ? 'border-green-500 focus:ring-green-500/30'
                : 'border-gray-600 focus:ring-blue-500/30 focus:border-blue-500'
            }
            ${inputClassName}
          `}
          {...props}
        />
        {showStatus && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.valid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      {showStatus && !validation.valid && validation.message && (
        <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {validation.message}
        </p>
      )}
    </div>
  )
}

// Validated Select Component
export function ValidatedSelect({
  value,
  onChange,
  options = [],
  label,
  required = false,
  showValidation = true,
  className = '',
  ...props
}) {
  const [touched, setTouched] = useState(false)
  const isValid = !required || (value && value !== '')

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          onBlur={() => setTouched(true)}
          className={`
            w-full px-3 py-2 rounded-lg border bg-gray-800/50 text-gray-200
            transition-all duration-200
            focus:outline-none focus:ring-2
            ${showValidation && touched && !isValid
              ? 'border-red-500 focus:ring-red-500/30'
              : showValidation && touched && isValid && value
                ? 'border-green-500 focus:ring-green-500/30'
                : 'border-gray-600 focus:ring-blue-500/30 focus:border-blue-500'
            }
          `}
          {...props}
        >
          {options.map((opt, idx) => (
            <option key={idx} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {showValidation && touched && value && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Form validation hook
export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validate = useCallback(() => {
    const newErrors = {}
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = values[field]
      
      if (rules.required && (!value || value.toString().trim() === '')) {
        newErrors[field] = rules.requiredMessage || 'This field is required'
        continue
      }
      
      if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `Minimum ${rules.minLength} characters required`
        continue
      }
      
      if (rules.maxLength && value && value.length > rules.maxLength) {
        newErrors[field] = `Maximum ${rules.maxLength} characters allowed`
        continue
      }
      
      if (rules.pattern && value && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternMessage || 'Invalid format'
        continue
      }
      
      if (rules.custom) {
        const customError = rules.custom(value, values)
        if (customError) {
          newErrors[field] = customError
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [values, validationRules])

  const setValue = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  const setFieldTouched = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const isValid = Object.keys(errors).length === 0

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setFieldTouched,
    validate,
    setValues
  }
}

// Validation indicator badge
export function ValidationBadge({ isValid, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isValid 
        ? 'bg-green-500/20 text-green-400' 
        : 'bg-red-500/20 text-red-400'
    } ${className}`}>
      {isValid ? (
        <>
          <CheckCircle2 className="w-3 h-3" />
          Valid
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3" />
          Invalid
        </>
      )}
    </span>
  )
}

export default { ValidatedInput, ValidatedSelect, useFormValidation, ValidationBadge }

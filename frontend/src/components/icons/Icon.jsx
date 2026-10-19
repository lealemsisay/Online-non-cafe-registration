import React from 'react'
import {
  Building,
  Menu,
  Grid3x3,
  Users,
  SlidersHorizontal,
  UserCheck,
  Upload,
} from 'lucide-react'

const icons = {
  'building': Building,
  'menu': Menu,
  'grid': Grid3x3,
  'users': Users,
  'sliders-horizontal': SlidersHorizontal,
  'user-check': UserCheck,
  'upload': Upload,
}

const Icon = ({ name, ...props }) => {
  const LucideIcon = icons[name] || Building
  return <LucideIcon {...props} />
}

export default Icon

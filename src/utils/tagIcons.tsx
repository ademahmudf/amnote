import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Briefcase,
  BookOpen,
  Lightbulb,
  Code,
  CheckSquare,
  DollarSign,
  Home,
  Plane,
  Music,
  Film,
  Coffee,
  Palette,
  Activity,
  Heart,
  Gamepad2,
  Archive,
  Target,
  ShoppingBag,
  Star,
  Calendar,
  Lock,
  Terminal,
  Rocket,
  Flame,
  Sparkles,
  Smile,
  Folder,
  Tag as TagIcon,
  Globe,
  Bookmark,
  Compass,
  Gift,
  Layers,
  Zap,
  Cloud,
  Cpu,
  FileText,
  Flag,
  Shield,
  Sliders,
  Camera,
  Book,
  PenTool,
  Hash,
  type LucideIcon,
} from 'lucide-react';

export interface TagIconOption {
  id: string;
  name: string;
  category: 'Work & Dev' | 'Lifestyle & Travel' | 'Media & Art' | 'Organization' | 'General';
  icon: LucideIcon;
}

export const TAG_ICON_REGISTRY: Record<string, LucideIcon> = {
  // Work & Dev
  Briefcase,
  Code,
  Terminal,
  Cpu,
  Rocket,
  Zap,
  Target,
  CheckSquare,
  Sliders,
  Shield,

  // Organization
  Folder,
  Tag: TagIcon,
  Bookmark,
  Archive,
  Layers,
  Calendar,
  Lock,
  FileText,
  Flag,
  Hash,

  // Knowledge & Lifestyle
  BookOpen,
  Book,
  Lightbulb,
  Home,
  DollarSign,
  ShoppingBag,
  Coffee,
  Activity,
  Heart,
  Plane,
  Compass,
  Globe,

  // Media & Creative
  Palette,
  PenTool,
  Music,
  Film,
  Camera,
  Gamepad2,
  Star,
  Sparkles,
  Flame,
  Smile,
  Gift,
  Cloud,
};

export const TAG_ICON_LIST: TagIconOption[] = [
  // Work & Dev
  { id: 'Briefcase', name: 'Work / Business', category: 'Work & Dev', icon: Briefcase },
  { id: 'Code', name: 'Coding / Dev', category: 'Work & Dev', icon: Code },
  { id: 'Terminal', name: 'Terminal / Linux', category: 'Work & Dev', icon: Terminal },
  { id: 'Rocket', name: 'Rocket / Startup', category: 'Work & Dev', icon: Rocket },
  { id: 'Target', name: 'Goals / Roadmap', category: 'Work & Dev', icon: Target },
  { id: 'CheckSquare', name: 'Tasks / Checklist', category: 'Work & Dev', icon: CheckSquare },
  { id: 'Cpu', name: 'Hardware / Tech', category: 'Work & Dev', icon: Cpu },
  { id: 'Zap', name: 'Fast / Performance', category: 'Work & Dev', icon: Zap },
  { id: 'Shield', name: 'Security / Privacy', category: 'Work & Dev', icon: Shield },

  // Knowledge & Lifestyle
  { id: 'Lightbulb', name: 'Ideas / Thoughts', category: 'Lifestyle & Travel', icon: Lightbulb },
  { id: 'BookOpen', name: 'Guide / Reading', category: 'Lifestyle & Travel', icon: BookOpen },
  { id: 'Book', name: 'Book / Study', category: 'Lifestyle & Travel', icon: Book },
  { id: 'Home', name: 'Home / Family', category: 'Lifestyle & Travel', icon: Home },
  { id: 'DollarSign', name: 'Finance / Money', category: 'Lifestyle & Travel', icon: DollarSign },
  { id: 'ShoppingBag', name: 'Shopping / Buy', category: 'Lifestyle & Travel', icon: ShoppingBag },
  { id: 'Coffee', name: 'Coffee / Cafe', category: 'Lifestyle & Travel', icon: Coffee },
  { id: 'Heart', name: 'Health / Favorites', category: 'Lifestyle & Travel', icon: Heart },
  { id: 'Activity', name: 'Fitness / Workout', category: 'Lifestyle & Travel', icon: Activity },
  { id: 'Plane', name: 'Travel / Vacation', category: 'Lifestyle & Travel', icon: Plane },
  { id: 'Compass', name: 'Explore / Trip', category: 'Lifestyle & Travel', icon: Compass },
  { id: 'Globe', name: 'Web / World', category: 'Lifestyle & Travel', icon: Globe },

  // Media & Creative
  { id: 'Palette', name: 'Design / Art', category: 'Media & Art', icon: Palette },
  { id: 'PenTool', name: 'Writing / Author', category: 'Media & Art', icon: PenTool },
  { id: 'Music', name: 'Music / Audio', category: 'Media & Art', icon: Music },
  { id: 'Film', name: 'Movies / Video', category: 'Media & Art', icon: Film },
  { id: 'Camera', name: 'Photos / Camera', category: 'Media & Art', icon: Camera },
  { id: 'Gamepad2', name: 'Gaming / Play', category: 'Media & Art', icon: Gamepad2 },
  { id: 'Sparkles', name: 'Magic / Special', category: 'Media & Art', icon: Sparkles },
  { id: 'Star', name: 'Star / Featured', category: 'Media & Art', icon: Star },
  { id: 'Flame', name: 'Trending / Hot', category: 'Media & Art', icon: Flame },

  // Organization
  { id: 'Folder', name: 'Folder / Projects', category: 'Organization', icon: Folder },
  { id: 'Tag', name: 'Tag / Label', category: 'Organization', icon: TagIcon },
  { id: 'Bookmark', name: 'Bookmark', category: 'Organization', icon: Bookmark },
  { id: 'Archive', name: 'Archive / Storage', category: 'Organization', icon: Archive },
  { id: 'Calendar', name: 'Meeting / Events', category: 'Organization', icon: Calendar },
  { id: 'Lock', name: 'Secret / Locked', category: 'Organization', icon: Lock },
  { id: 'Flag', name: 'Milestone / Flag', category: 'Organization', icon: Flag },
];

/**
 * Intelligent AmNote TagCon keyword matching
 */
export function getAutoTagIcon(tag: string): LucideIcon {
  const clean = tag.toLowerCase();

  if (/(work|job|career|office|business|client|corp|sprint)/.test(clean)) return Briefcase;
  if (/(guide|doc|docs|readme|manual|tutorial|learn|study|wiki|note)/.test(clean)) return BookOpen;
  if (/(idea|ideas|brainstorm|concept|think|innovat)/.test(clean)) return Lightbulb;
  if (/(code|dev|program|rust|ts|js|react|python|css|html|git|bug|api)/.test(clean)) return Code;
  if (/(terminal|linux|omarchy|server|bash|shell|hyprland|arch)/.test(clean)) return Terminal;
  if (/(todo|task|tasks|check|list|goal|roadmap|plan)/.test(clean)) return CheckSquare;
  if (/(tag|tags|label|badge|mark)/.test(clean)) return TagIcon;
  if (/(money|finance|budget|cost|crypto|salary|invoice|bank|tax)/.test(clean)) return DollarSign;
  if (/(home|house|family|personal|life|apartment)/.test(clean)) return Home;
  if (/(travel|trip|flight|vacation|hotel|explore|tour)/.test(clean)) return Plane;
  if (/(music|song|audio|podcast|album|spotify|guitar)/.test(clean)) return Music;
  if (/(movie|film|video|cinema|youtube|show|netflix)/.test(clean)) return Film;
  if (/(food|recipe|cook|coffee|meal|eat|drink|tea)/.test(clean)) return Coffee;
  if (/(design|art|ui|ux|figma|draw|illustration|sketch)/.test(clean)) return Palette;
  if (/(health|fitness|gym|workout|sport|run|med)/.test(clean)) return Heart;
  if (/(game|gaming|steam|play|rpg)/.test(clean)) return Gamepad2;
  if (/(shop|shopping|buy|cart|store|order)/.test(clean)) return ShoppingBag;
  if (/(star|favorite|fav|important|vip)/.test(clean)) return Star;
  if (/(meet|meeting|calendar|event|schedule|date)/.test(clean)) return Calendar;
  if (/(lock|secret|private|password|cred|auth)/.test(clean)) return Lock;
  if (/(archive|vault|backup|old)/.test(clean)) return Archive;
  if (/(rocket|release|launch|ship|fast)/.test(clean)) return Rocket;
  if (/(photo|image|picture|camera)/.test(clean)) return Camera;
  if (/(book|novel|reading|read)/.test(clean)) return Book;
  if (/(write|author|blog|post|draft)/.test(clean)) return PenTool;

  return TagIcon;
}

/**
 * Returns the resolved React Icon component for a given tag path
 */
export function resolveTagIcon(tag: string, customIconName?: string): LucideIcon {
  if (customIconName && TAG_ICON_REGISTRY[customIconName]) {
    return TAG_ICON_REGISTRY[customIconName];
  }
  return getAutoTagIcon(tag);
}

/**
 * Returns true if the tag has a distinctive icon, and is not explicitly set to '#' Hash.
 */
export function hasSpecificTagIcon(tag: string, customIconName?: string): boolean {
  if (customIconName === 'Hash') {
    return false;
  }
  const icon = resolveTagIcon(tag, customIconName);
  return icon !== Hash;
}

/**
 * Auto-capitalizes tag segments and paths for UI display (e.g. 'omarchy-linux' -> 'Omarchy Linux', 'ideas/apps' -> 'Ideas / Apps')
 */
export function formatTagDisplay(tag: string): string {
  if (!tag) return '';
  const clean = tag.replace(/^#+/, '');
  return clean
    .split('/')
    .map((segment) =>
      segment
        .split(/([-_ ])/)
        .map((part) => {
          if (part === '-' || part === '_' || part === ' ') return ' ';
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('')
        .trim()
    )
    .join(' / ');
}

/**
 * Auto-capitalizes a single tag segment for tree node display
 */
export function formatTagSegment(segment: string): string {
  if (!segment) return '';
  return segment
    .split(/([-_ ])/)
    .map((part) => {
      if (part === '-' || part === '_' || part === ' ') return ' ';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('')
    .trim();
}

/**
 * Component to render a Tag Icon with optional custom color
 */
export const TagIconBadge: React.FC<{
  tag: string;
  customIcon?: string;
  size?: number;
  className?: string;
  color?: string;
}> = ({ tag, customIcon, size = 13, className = '', color }) => {
  const IconComponent = resolveTagIcon(tag, customIcon);
  return (
    <IconComponent
      size={size}
      className={className}
      style={{ color: color || undefined }}
    />
  );
};

const tagIconSvgCache = new Map<string, string>();

/**
 * Returns a static SVG string representation of the resolved tag icon,
 * ideal for ProseMirror widget decorations.
 */
export function getTagIconSvgString(
  tag: string,
  customIconName?: string,
  size: number | string = '0.9em',
  color?: string
): string {
  const cacheKey = `${tag}:${customIconName || ''}:${size}:${color || ''}`;
  const cached = tagIconSvgCache.get(cacheKey);
  if (cached) return cached;

  const IconComp = resolveTagIcon(tag, customIconName);
  const svg = renderToStaticMarkup(
    React.createElement(IconComp, {
      size: size as any,
      className: 'am-tag-svg align-baseline shrink-0',
      style: color ? { color } : undefined,
      strokeWidth: 2.2,
    })
  );
  tagIconSvgCache.set(cacheKey, svg);
  return svg;
}

const tagIconDataUrlCache = new Map<string, string>();

/**
 * Returns a data:image/svg+xml URL representation of the resolved tag icon,
 * ideal for CSS mask-image and background-image on tag pills.
 */
export function getTagIconDataUrl(
  tag: string,
  customIconName?: string
): string {
  const cacheKey = `${tag}:${customIconName || ''}`;
  const cached = tagIconDataUrlCache.get(cacheKey);
  if (cached) return cached;

  const IconComp = resolveTagIcon(tag, customIconName);
  const svg = renderToStaticMarkup(
    React.createElement(IconComp, {
      size: 16,
      color: 'black',
      strokeWidth: 2.2,
    })
  );
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  tagIconDataUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

export function clearTagIconSvgCache(): void {
  tagIconSvgCache.clear();
  tagIconDataUrlCache.clear();
}


import {
  AcademicCapIcon,
  BookOpenIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CodeBracketIcon,
  CpuChipIcon,
  DocumentIcon,
  FilmIcon,
  FolderIcon,
  GlobeAltIcon,
  HeartIcon,
  HomeIcon,
  LightBulbIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  NewspaperIcon,
  PaintBrushIcon,
  PhotoIcon,
  RocketLaunchIcon,
  ShoppingCartIcon,
  StarIcon,
  TagIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import type { ComponentType, SVGProps } from 'react';

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

export const COLLECTION_ICONS: { id: string; component: HeroIcon }[] = [
  { id: 'BookmarkIcon', component: BookmarkIcon },
  { id: 'FolderIcon', component: FolderIcon },
  { id: 'StarIcon', component: StarIcon },
  { id: 'HeartIcon', component: HeartIcon },
  { id: 'TagIcon', component: TagIcon },
  { id: 'DocumentIcon', component: DocumentIcon },
  { id: 'FilmIcon', component: FilmIcon },
  { id: 'MusicalNoteIcon', component: MusicalNoteIcon },
  { id: 'PhotoIcon', component: PhotoIcon },
  { id: 'CodeBracketIcon', component: CodeBracketIcon },
  { id: 'AcademicCapIcon', component: AcademicCapIcon },
  { id: 'BriefcaseIcon', component: BriefcaseIcon },
  { id: 'ShoppingCartIcon', component: ShoppingCartIcon },
  { id: 'HomeIcon', component: HomeIcon },
  { id: 'GlobeAltIcon', component: GlobeAltIcon },
  { id: 'LightBulbIcon', component: LightBulbIcon },
  { id: 'NewspaperIcon', component: NewspaperIcon },
  { id: 'RocketLaunchIcon', component: RocketLaunchIcon },
  { id: 'MicrophoneIcon', component: MicrophoneIcon },
  { id: 'TrophyIcon', component: TrophyIcon },
  { id: 'BookOpenIcon', component: BookOpenIcon },
  { id: 'BuildingLibraryIcon', component: BuildingLibraryIcon },
  { id: 'CpuChipIcon', component: CpuChipIcon },
  { id: 'PaintBrushIcon', component: PaintBrushIcon },
];

export function getCollectionIcon(id: string | null | undefined): HeroIcon | null {
  if (!id) return null;
  return COLLECTION_ICONS.find((i) => i.id === id)?.component ?? null;
}

import React from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Trash2, GripVertical, ImageIcon, Link as LinkIcon, Award, Edit, TextIcon, Briefcase, GraduationCap, MapPin, BookOpen } from 'lucide-react'
import { Input } from "@components/ui/input"
import { Textarea } from "@components/ui/textarea"
import { Label } from "@components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Button } from "@components/ui/button"
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { updateProfile } from '@services/settings/profile'
import { getOwnUser } from '@services/users/users'
import { toast } from 'react-hot-toast'

import { useTranslation } from 'react-i18next'
import { t as translate } from 'i18next'

const SECTION_TYPES = {
  'image-gallery': {
    icon: ImageIcon,
    labelKey: 'user.settings.profile_builder.section_types.image_gallery.label',
    descriptionKey: 'user.settings.profile_builder.section_types.image_gallery.description'
  },
  'text': {
    icon: TextIcon,
    labelKey: 'user.settings.profile_builder.section_types.text.label',
    descriptionKey: 'user.settings.profile_builder.section_types.text.description'
  },
  'links': {
    icon: LinkIcon,
    labelKey: 'user.settings.profile_builder.section_types.links.label',
    descriptionKey: 'user.settings.profile_builder.section_types.links.description'
  },
  'skills': {
    icon: Award,
    labelKey: 'user.settings.profile_builder.section_types.skills.label',
    descriptionKey: 'user.settings.profile_builder.section_types.skills.description'
  },
  'experience': {
    icon: Briefcase,
    labelKey: 'user.settings.profile_builder.section_types.experience.label',
    descriptionKey: 'user.settings.profile_builder.section_types.experience.description'
  },
  'education': {
    icon: GraduationCap,
    labelKey: 'user.settings.profile_builder.section_types.education.label',
    descriptionKey: 'user.settings.profile_builder.section_types.education.description'
  },
  'affiliation': {
    icon: MapPin,
    labelKey: 'user.settings.profile_builder.section_types.affiliation.label',
    descriptionKey: 'user.settings.profile_builder.section_types.affiliation.description'
  },
  'courses': {
    icon: BookOpen,
    labelKey: 'user.settings.profile_builder.section_types.courses.label',
    descriptionKey: 'user.settings.profile_builder.section_types.courses.description'
  }
} as const

interface ProfileImage {
  url: string;
  caption?: string;
}

interface ProfileLink {
  title: string;
  url: string;
  icon?: string;
}

interface ProfileSkill {
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
}

interface ProfileExperience {
  title: string;
  organization: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

interface ProfileEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

interface ProfileAffiliation {
  name: string;
  description: string;
  logoUrl: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  status: string;
}

interface BaseSection {
  id: string;
  type: keyof typeof SECTION_TYPES;
  title: string;
}

interface ImageGallerySection extends BaseSection {
  type: 'image-gallery';
  images: ProfileImage[];
}

interface TextSection extends BaseSection {
  type: 'text';
  content: string;
}

interface LinksSection extends BaseSection {
  type: 'links';
  links: ProfileLink[];
}

interface SkillsSection extends BaseSection {
  type: 'skills';
  skills: ProfileSkill[];
}

interface ExperienceSection extends BaseSection {
  type: 'experience';
  experiences: ProfileExperience[];
}

interface EducationSection extends BaseSection {
  type: 'education';
  education: ProfileEducation[];
}

interface AffiliationSection extends BaseSection {
  type: 'affiliation';
  affiliations: ProfileAffiliation[];
}

interface CoursesSection extends BaseSection {
  type: 'courses';

}

type ProfileSection = 
  | ImageGallerySection 
  | TextSection 
  | LinksSection 
  | SkillsSection 
  | ExperienceSection 
  | EducationSection
  | AffiliationSection
  | CoursesSection;

interface ProfileData {
  sections: ProfileSection[];
}

const UserProfileBuilder = () => {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [profileData, setProfileData] = React.useState<ProfileData>({
    sections: []
  })
  const [selectedSection, setSelectedSection] = React.useState<number | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const { t } = useTranslation()

  React.useEffect(() => {
    const fetchUserData = async () => {
      if (session?.data?.user?.id && access_token) {
        try {
          setIsLoading(true)
          const userData = await getOwnUser(access_token)
          
          if (userData.profile) {
            try {
              const profileSections = typeof userData.profile === 'string'
                ? JSON.parse(userData.profile).sections
                : userData.profile.sections;

              setProfileData({
                sections: profileSections || []
              });
            } catch (error) {
              console.error('Error parsing profile data:', error);
              setProfileData({ sections: [] });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error(translate('user.settings.profile_builder.toasts.loading_error'));
        } finally {
          setIsLoading(false)
        }
      }
    };

    fetchUserData();
  }, [session?.data?.user?.id, access_token])

  const createEmptySection = (type: keyof typeof SECTION_TYPES): ProfileSection => {
    const baseSection = {
      id: `section-${Date.now()}`,
      type,
      title: t(SECTION_TYPES[type].labelKey)
    }

    switch (type) {
      case 'image-gallery':
        return {
          ...baseSection,
          type: 'image-gallery',
          images: []
        }
      case 'text':
        return {
          ...baseSection,
          type: 'text',
          content: ''
        }
      case 'links':
        return {
          ...baseSection,
          type: 'links',
          links: []
        }
      case 'skills':
        return {
          ...baseSection,
          type: 'skills',
          skills: []
        }
      case 'experience':
        return {
          ...baseSection,
          type: 'experience',
          experiences: []
        }
      case 'education':
        return {
          ...baseSection,
          type: 'education',
          education: []
        }
      case 'affiliation':
        return {
          ...baseSection,
          type: 'affiliation',
          affiliations: []
        }
      case 'courses':
        return {
          ...baseSection,
          type: 'courses'
        }
    }
  }

  const addSection = (type: keyof typeof SECTION_TYPES) => {
    const newSection = createEmptySection(type)
    setProfileData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }))
    setSelectedSection(profileData.sections.length)
  }

  const updateSection = (index: number, updatedSection: ProfileSection) => {
    const newSections = [...profileData.sections]
    newSections[index] = updatedSection
    setProfileData(prev => ({
      ...prev,
      sections: newSections
    }))
  }

  const deleteSection = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index)
    }))
    setSelectedSection(null)
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(profileData.sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setProfileData(prev => ({
      ...prev,
      sections: items
    }))
    setSelectedSection(result.destination.index)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading(t('user.settings.profile_builder.saving'))

    try {

      const userData = await getOwnUser(access_token)

      userData.profile = profileData

      const res = await updateProfile(userData, userData.id, access_token)

      if (res.status === 200) {
        toast.success(t('user.settings.profile_builder.toasts.save_success'), { id: loadingToast })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(t('user.settings.profile_builder.toasts.save_error'), { id: loadingToast })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl nice-shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl nice-shadow">
      <div className="flex flex-col gap-0">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-gray-50 px-4 py-3 mx-3 my-3 rounded-md">
          <div className="flex flex-col -space-y-1">
            <h1 className="font-bold text-xl text-gray-800 flex flex-wrap gap-1 items-center">
              {t('user.settings.profile_builder.title')}
              <span className="text-xs ms-2 bg-gray-200 text-gray-700 px-2 py-1 rounded-full">{t('user.settings.profile_builder.beta')}</span>
            </h1>
            <h2 className="text-gray-500 text-md">{t('user.settings.profile_builder.subtitle')}</h2>
          </div>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-black hover:bg-black/90 h-auto min-h-11 whitespace-normal shrink-0"
          >
            {isSaving ? t('user.settings.profile_builder.saving') : t('user.settings.profile_builder.save_changes')}
          </Button>
        </div>

        <div className="mx-3 sm:mx-5 mb-5 min-w-0 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(220px,1fr)_minmax(0,3fr)] gap-6">
          <div className="min-w-0 xl:border-e xl:pe-4">
            <h3 className="font-medium mb-4">{t('user.settings.profile_builder.sections')}</h3>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="sections">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {profileData.sections.map((section, index) => (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            onClick={() => setSelectedSection(index)}
                            className={`p-4 bg-white/80 backdrop-blur-xs rounded-lg cursor-pointer border ${
                              selectedSection === index 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-xs'
                            } ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/20 rotate-2' : ''}`}
                          >
                            <div className="flex min-w-0 flex-col sm:flex-row sm:items-center justify-between gap-1 group">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <div {...provided.dragHandleProps} aria-label={t('student_experience.move_section')}
                                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors duration-200 ${
                                    selectedSection === index 
                                      ? 'text-blue-500 bg-blue-100/50' 
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}>
                                  <GripVertical size={16} />
                                </div>
                                <div className={`p-1.5 rounded-md ${
                                  selectedSection === index 
                                    ? 'text-blue-600 bg-blue-100/50' 
                                    : 'text-gray-600 bg-gray-100/50'
                                }`}>
                                  {React.createElement(SECTION_TYPES[section.type].icon, {
                                    size: 16
                                  })}
                                </div>
                                <span className={`min-w-0 break-words text-sm font-medium ${
                                  selectedSection === index 
                                    ? 'text-blue-700' 
                                    : 'text-gray-700'
                                }`}>
                                  {section.title}
                                </span>
                              </div>
                              <div className="flex shrink-0 justify-end gap-1">
                                <button
                                  aria-label={t('student_experience.edit_section')}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSection(index)
                                  }}
                                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors duration-200 ${
                                    selectedSection === index
                                      ? 'text-blue-500 hover:bg-blue-100'
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  aria-label={t('student_experience.delete_section')}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteSection(index)
                                  }}
                                  className="flex min-h-11 min-w-11 items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-200"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="pt-4">
              <Select
                onValueChange={(value: keyof typeof SECTION_TYPES) => {
                  if (value) {
                    addSection(value)
                  }
                }}
              >
                <SelectTrigger aria-label={t('user.settings.profile_builder.add_section')} className="w-full h-auto min-h-11 bg-black text-white px-3 py-3 whitespace-normal">
                  <div className="flex min-w-0 items-center gap-2 text-start"><Plus className="h-4 w-4 shrink-0" /><span>{t('user.settings.profile_builder.add_section')}</span></div>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_TYPES).map(([type, { icon: Icon, labelKey, descriptionKey }]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center space-x-3 py-1">
                        <div className="p-1.5 bg-gray-50 rounded-md">
                          <Icon size={16} className="text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-700">{t(labelKey)}</div>
                          <div className="text-xs text-gray-500">{t(descriptionKey)}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="min-w-0">
            {selectedSection !== null && profileData.sections[selectedSection] ? (
              <SectionEditor
                section={profileData.sections[selectedSection]}
                onChange={(updatedSection) => updateSection(selectedSection, updatedSection as ProfileSection)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('user.settings.profile_builder.select_section')}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

interface SectionEditorProps {
  section: ProfileSection;
  onChange: (section: ProfileSection) => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, onChange }) => {
  const { t } = useTranslation()
  switch (section.type) {
    case 'image-gallery':
      return <ImageGalleryEditor section={section} onChange={onChange} />
    case 'text':
      return <TextEditor section={section} onChange={onChange} />
    case 'links':
      return <LinksEditor section={section} onChange={onChange} />
    case 'skills':
      return <SkillsEditor section={section} onChange={onChange} />
    case 'experience':
      return <ExperienceEditor section={section} onChange={onChange} />
    case 'education':
      return <EducationEditor section={section} onChange={onChange} />
    case 'affiliation':
      return <AffiliationEditor section={section} onChange={onChange} />
    case 'courses':
      return <CoursesEditor section={section} onChange={onChange} />
    default:
      return <div>{t('user.settings.profile_builder.unknown_section')}</div>
  }
}

const ImageGalleryEditor: React.FC<{
  section: ImageGallerySection;
  onChange: (section: ImageGallerySection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <ImageIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.image_gallery.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.image_gallery.images')}</Label>
          <div className="space-y-3 mt-2">
            {section.images.map((image, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-4 p-4 border rounded-lg">
                <div>
                  <Label>{t('user.settings.profile_builder.editors.image_gallery.image_url')}</Label>
                  <Input className="min-h-11"
                    value={image.url}
                    onChange={(e) => {
                      const newImages = [...section.images]
                      newImages[index] = { ...image, url: e.target.value }
                      onChange({ ...section, images: newImages })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.image_gallery.enter_image_url')}
                    placeholder={t('user.settings.profile_builder.editors.image_gallery.enter_image_url')}
                  />
                </div>
                <div>
                  <Label>{t('user.settings.profile_builder.editors.image_gallery.caption')}</Label>
                  <Input className="min-h-11"
                    value={image.caption || ''}
                    onChange={(e) => {
                      const newImages = [...section.images]
                      newImages[index] = { ...image, caption: e.target.value }
                      onChange({ ...section, images: newImages })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.image_gallery.image_caption')}
                    placeholder={t('user.settings.profile_builder.editors.image_gallery.image_caption')}
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <Label>&nbsp;</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                  aria-label={t('student_experience.delete_item')}
                    onClick={() => {
                      const newImages = section.images.filter((_, i) => i !== index)
                      onChange({ ...section, images: newImages })
                    }}
                    className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {image.url && (
                  <div className="min-w-0">
                    <img
                      src={image.url}
                      alt={image.caption || ''}
                      className="mt-2 max-h-32 rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newImage: ProfileImage = {
                  url: '',
                  caption: ''
                }
                onChange({
                  ...section,
                  images: [...section.images, newImage]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.image_gallery.add_image')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TextEditor: React.FC<{
  section: TextSection;
  onChange: (section: TextSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <TextIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.text.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label htmlFor="content">{t('user.settings.profile_builder.editors.text.content')}</Label>
          <Textarea
            id="content"
            value={section.content}
            onChange={(e) => onChange({ ...section, content: e.target.value })}
            aria-label={t('user.settings.profile_builder.editors.text.enter_content')}
            placeholder={t('user.settings.profile_builder.editors.text.enter_content')}
            className="min-h-[200px]"
          />
        </div>
      </div>
    </div>
  )
}

const LinksEditor: React.FC<{
  section: LinksSection;
  onChange: (section: LinksSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <LinkIcon className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.links.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.links.links')}</Label>
          <div className="space-y-3 mt-2">
            {section.links.map((link, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 p-4 border rounded-lg">
                <Input className="min-h-11"
                  value={link.title}
                  onChange={(e) => {
                    const newLinks = [...section.links]
                    newLinks[index] = { ...link, title: e.target.value }
                    onChange({ ...section, links: newLinks })
                  }}
                  aria-label={t('user.settings.profile_builder.editors.links.link_title')}
                  placeholder={t('user.settings.profile_builder.editors.links.link_title')}
                />
                <Input className="min-h-11"
                  value={link.url}
                  onChange={(e) => {
                    const newLinks = [...section.links]
                    newLinks[index] = { ...link, url: e.target.value }
                    onChange({ ...section, links: newLinks })
                  }}
                  aria-label={t('user.settings.profile_builder.editors.links.url')}
                  placeholder={t('user.settings.profile_builder.editors.links.url')}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('student_experience.delete_item')}
                  onClick={() => {
                    const newLinks = section.links.filter((_, i) => i !== index)
                    onChange({ ...section, links: newLinks })
                  }}
                  className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newLink: ProfileLink = {
                  title: '',
                  url: ''
                }
                onChange({
                  ...section,
                  links: [...section.links, newLink]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.links.add_link')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const SkillsEditor: React.FC<{
  section: SkillsSection;
  onChange: (section: SkillsSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <Award className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.skills.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.skills.skills')}</Label>
          <div className="space-y-3 mt-2">
            {section.skills.map((skill, index) => (
              <div key={index} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 p-4 border rounded-lg">
                <Input className="min-h-11"
                  value={skill.name}
                  onChange={(e) => {
                    const newSkills = [...section.skills]
                    newSkills[index] = { ...skill, name: e.target.value }
                    onChange({ ...section, skills: newSkills })
                  }}
                  aria-label={t('user.settings.profile_builder.editors.skills.skill_name')}
                  placeholder={t('user.settings.profile_builder.editors.skills.skill_name')}
                />
                <Select
                  value={skill.level || 'intermediate'}
                  onValueChange={(value) => {
                    const newSkills = [...section.skills]
                    newSkills[index] = { ...skill, level: value as ProfileSkill['level'] }
                    onChange({ ...section, skills: newSkills })
                  }}
                >
                  <SelectTrigger className="min-h-11" aria-label={t('user.settings.profile_builder.editors.skills.select_level')}>
                    <SelectValue aria-label={t('user.settings.profile_builder.editors.skills.select_level')}
 placeholder={t('user.settings.profile_builder.editors.skills.select_level')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t('user.settings.profile_builder.editors.skills.levels.beginner')}</SelectItem>
                    <SelectItem value="intermediate">{t('user.settings.profile_builder.editors.skills.levels.intermediate')}</SelectItem>
                    <SelectItem value="advanced">{t('user.settings.profile_builder.editors.skills.levels.advanced')}</SelectItem>
                    <SelectItem value="expert">{t('user.settings.profile_builder.editors.skills.levels.expert')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="min-h-11"
                  value={skill.category || ''}
                  onChange={(e) => {
                    const newSkills = [...section.skills]
                    newSkills[index] = { ...skill, category: e.target.value }
                    onChange({ ...section, skills: newSkills })
                  }}
                  aria-label={t('user.settings.profile_builder.editors.skills.category')}
                  placeholder={t('user.settings.profile_builder.editors.skills.category')}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('student_experience.delete_item')}
                  onClick={() => {
                    const newSkills = section.skills.filter((_, i) => i !== index)
                    onChange({ ...section, skills: newSkills })
                  }}
                  className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newSkill: ProfileSkill = {
                  name: '',
                  level: 'intermediate'
                }
                onChange({
                  ...section,
                  skills: [...section.skills, newSkill]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.skills.add_skill')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ExperienceEditor: React.FC<{
  section: ExperienceSection;
  onChange: (section: ExperienceSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <Briefcase className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.experience.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.experience.items')}</Label>
          <div className="space-y-4 mt-2">
            {section.experiences.map((experience, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.experience.role_title')}</Label>
                    <Input className="min-h-11"
                      value={experience.title}
                      onChange={(e) => {
                        const newExperiences = [...section.experiences]
                        newExperiences[index] = { ...experience, title: e.target.value }
                        onChange({ ...section, experiences: newExperiences })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.experience.role_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.experience.role_placeholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.experience.organization')}</Label>
                    <Input className="min-h-11"
                      value={experience.organization}
                      onChange={(e) => {
                        const newExperiences = [...section.experiences]
                        newExperiences[index] = { ...experience, organization: e.target.value }
                        onChange({ ...section, experiences: newExperiences })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.experience.organization_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.experience.organization_placeholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4">
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.experience.start_date')}</Label>
                    <Input className="min-h-11"
                      type="date"
                      value={experience.startDate}
                      onChange={(e) => {
                        const newExperiences = [...section.experiences]
                        newExperiences[index] = { ...experience, startDate: e.target.value }
                        onChange({ ...section, experiences: newExperiences })
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.experience.end_date')}</Label>
                    <Input className="min-h-11"
                      type="date"
                      value={experience.endDate || ''}
                      onChange={(e) => {
                        const newExperiences = [...section.experiences]
                        newExperiences[index] = { ...experience, endDate: e.target.value }
                        onChange({ ...section, experiences: newExperiences })
                      }}
                      disabled={experience.current}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`current-${index}`}
                        checked={experience.current}
                        onChange={(e) => {
                          const newExperiences = [...section.experiences]
                          newExperiences[index] = { 
                            ...experience, 
                            current: e.target.checked,
                            endDate: e.target.checked ? undefined : experience.endDate 
                          }
                          onChange({ ...section, experiences: newExperiences })
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`current-${index}`}>{t('user.settings.profile_builder.editors.experience.current')}</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>{t('user.settings.profile_builder.editors.experience.description')}</Label>
                  <Textarea
                    value={experience.description}
                    onChange={(e) => {
                      const newExperiences = [...section.experiences]
                      newExperiences[index] = { ...experience, description: e.target.value }
                      onChange({ ...section, experiences: newExperiences })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.experience.description_placeholder')}
                    placeholder={t('user.settings.profile_builder.editors.experience.description_placeholder')}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newExperiences = section.experiences.filter((_, i) => i !== index)
                      onChange({ ...section, experiences: newExperiences })
                    }}
                    className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('user.settings.general.remove')}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newExperience: ProfileExperience = {
                  title: '',
                  organization: '',
                  startDate: new Date().toISOString().split('T')[0],
                  current: false,
                  description: ''
                }
                onChange({
                  ...section,
                  experiences: [...section.experiences, newExperience]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.experience.add_experience')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EducationEditor: React.FC<{
  section: EducationSection;
  onChange: (section: EducationSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <GraduationCap className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.education.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.education.items')}</Label>
          <div className="space-y-4 mt-2">
            {section.education.map((edu, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.education.institution')}</Label>
                    <Input className="min-h-11"
                      value={edu.institution}
                      onChange={(e) => {
                        const newEducation = [...section.education]
                        newEducation[index] = { ...edu, institution: e.target.value }
                        onChange({ ...section, education: newEducation })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.education.institution_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.education.institution_placeholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.education.degree')}</Label>
                    <Input className="min-h-11"
                      value={edu.degree}
                      onChange={(e) => {
                        const newEducation = [...section.education]
                        newEducation[index] = { ...edu, degree: e.target.value }
                        onChange({ ...section, education: newEducation })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.education.degree_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.education.degree_placeholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('user.settings.profile_builder.editors.education.field')}</Label>
                  <Input className="min-h-11"
                    value={edu.field}
                    onChange={(e) => {
                      const newEducation = [...section.education]
                      newEducation[index] = { ...edu, field: e.target.value }
                      onChange({ ...section, education: newEducation })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.education.field_placeholder')}
                    placeholder={t('user.settings.profile_builder.editors.education.field_placeholder')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4">
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.education.start_date')}</Label>
                    <Input className="min-h-11"
                      type="date"
                      value={edu.startDate}
                      onChange={(e) => {
                        const newEducation = [...section.education]
                        newEducation[index] = { ...edu, startDate: e.target.value }
                        onChange({ ...section, education: newEducation })
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.education.end_date')}</Label>
                    <Input className="min-h-11"
                      type="date"
                      value={edu.endDate || ''}
                      onChange={(e) => {
                        const newEducation = [...section.education]
                        newEducation[index] = { ...edu, endDate: e.target.value }
                        onChange({ ...section, education: newEducation })
                      }}
                      disabled={edu.current}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`current-edu-${index}`}
                        checked={edu.current}
                        onChange={(e) => {
                          const newEducation = [...section.education]
                          newEducation[index] = { 
                            ...edu, 
                            current: e.target.checked,
                            endDate: e.target.checked ? undefined : edu.endDate 
                          }
                          onChange({ ...section, education: newEducation })
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`current-edu-${index}`}>{t('user.settings.profile_builder.editors.education.current')}</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>{t('user.settings.profile_builder.editors.education.description')}</Label>
                  <Textarea
                    value={edu.description || ''}
                    onChange={(e) => {
                      const newEducation = [...section.education]
                      newEducation[index] = { ...edu, description: e.target.value }
                      onChange({ ...section, education: newEducation })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.education.description_placeholder')}
                    placeholder={t('user.settings.profile_builder.editors.education.description_placeholder')}
                    className="min-h-[150px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newEducation = section.education.filter((_, i) => i !== index)
                      onChange({ ...section, education: newEducation })
                    }}
                    className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('user.settings.general.remove')}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newEducation: ProfileEducation = {
                  institution: '',
                  degree: '',
                  field: '',
                  startDate: new Date().toISOString().split('T')[0],
                  current: false,
                  description: ''
                }
                onChange({
                  ...section,
                  education: [...section.education, newEducation]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.education.add_education')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const AffiliationEditor: React.FC<{
  section: AffiliationSection;
  onChange: (section: AffiliationSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <MapPin className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.affiliation.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>
        <div>
          <Label>{t('user.settings.profile_builder.editors.affiliation.affiliations')}</Label>
          <div className="space-y-3 mt-2">
            {section.affiliations.map((affiliation, index) => (
              <div key={index} className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.affiliation.name')}</Label>
                    <Input className="min-h-11"
                      value={affiliation.name}
                      onChange={(e) => {
                        const newAffiliations = [...section.affiliations]
                        newAffiliations[index] = { ...affiliation, name: e.target.value }
                        onChange({ ...section, affiliations: newAffiliations })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.affiliation.name_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.affiliation.name_placeholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('user.settings.profile_builder.editors.affiliation.logo_url')}</Label>
                    <Input className="min-h-11"
                      value={affiliation.logoUrl}
                      onChange={(e) => {
                        const newAffiliations = [...section.affiliations]
                        newAffiliations[index] = { ...affiliation, logoUrl: e.target.value }
                        onChange({ ...section, affiliations: newAffiliations })
                      }}
                      aria-label={t('user.settings.profile_builder.editors.affiliation.logo_url_placeholder')}
                      placeholder={t('user.settings.profile_builder.editors.affiliation.logo_url_placeholder')}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('user.settings.profile_builder.editors.affiliation.description')}</Label>
                  <Textarea
                    value={affiliation.description}
                    onChange={(e) => {
                      const newAffiliations = [...section.affiliations]
                      newAffiliations[index] = { ...affiliation, description: e.target.value }
                      onChange({ ...section, affiliations: newAffiliations })
                    }}
                    aria-label={t('user.settings.profile_builder.editors.affiliation.description_placeholder')}
                    placeholder={t('user.settings.profile_builder.editors.affiliation.description_placeholder')}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const newAffiliations = section.affiliations.filter((_, i) => i !== index)
                      onChange({ ...section, affiliations: newAffiliations })
                    }}
                    className="min-h-11 min-w-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('user.settings.general.remove')}
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newAffiliation: ProfileAffiliation = {
                  name: '',
                  description: '',
                  logoUrl: ''
                }
                onChange({
                  ...section,
                  affiliations: [...section.affiliations, newAffiliation]
                })
              }}
              className="w-full h-auto min-h-11 whitespace-normal"
            >
              <Plus className="h-4 w-4 me-2" />
              {t('user.settings.profile_builder.editors.affiliation.add_affiliation')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CoursesEditor: React.FC<{
  section: CoursesSection;
  onChange: (section: CoursesSection) => void;
}> = ({ section, onChange }) => {
  const { t } = useTranslation()
  return (
    <div className="space-y-6 p-3 sm:p-6 bg-white rounded-lg nice-shadow">
      <div className="flex items-center space-x-2">
        <BookOpen className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-lg">{t('user.settings.profile_builder.editors.courses.title')}</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">{t('user.settings.profile_builder.editors.section_title')}</Label>
          <Input className="min-h-11"
            id="title"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={t('user.settings.profile_builder.editors.enter_section_title')}
          />
        </div>

        <div className="text-sm text-gray-500 italic">
          {t('user.settings.profile_builder.editors.courses.info')}
        </div>
      </div>
    </div>
  )
}

export default UserProfileBuilder

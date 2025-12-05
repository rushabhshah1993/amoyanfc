import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faVideo, faUpload, faTimes, faPlus, faUser } from '@fortawesome/free-solid-svg-icons';
import { CREATE_ARTICLE, DELETE_ARTICLE, GET_ALL_FIGHTERS, GET_ALL_COMPETITIONS_META } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './CreateArticlePage.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface Competition {
    id: string;
    competitionName: string;
    shortName?: string;
    type: string;
}

const CreateArticlePage: React.FC = () => {
    const navigate = useNavigate();
    const thumbnailInputRef = useRef<HTMLInputElement>(null);
    
    // Article state
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [blurb, setBlurb] = useState('');
    const [author, setAuthor] = useState('');
    const [content, setContent] = useState('');
    const [thumbnail, setThumbnail] = useState<string>('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [selectedFighters, setSelectedFighters] = useState<Fighter[]>([]);
    const [fighterSearch, setFighterSearch] = useState('');
    const [showFighterDropdown, setShowFighterDropdown] = useState(false);
    const [selectedCompetitions, setSelectedCompetitions] = useState<Competition[]>([]);
    const [competitionSearch, setCompetitionSearch] = useState('');
    const [showCompetitionDropdown, setShowCompetitionDropdown] = useState(false);
    
    // Track images and videos embedded in content (base64 URL -> File mapping)
    const [contentImages, setContentImages] = useState<Map<string, File>>(new Map());
    const [contentVideos, setContentVideos] = useState<Map<string, File>>(new Map());
    
    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    
    // Create article mutation
    const [createArticle, { loading: creating }] = useMutation(CREATE_ARTICLE);
    const [deleteArticle] = useMutation(DELETE_ARTICLE);
    
    // Get all fighters for tagging
    const { data: fightersData } = useQuery(GET_ALL_FIGHTERS);
    
    // Get all competitions for tagging
    const { data: competitionsData } = useQuery(GET_ALL_COMPETITIONS_META);
    
    // Filter fighters based on search
    const filteredFighters = useMemo(() => {
        if (!fightersData?.getAllFighters || !fighterSearch) return [];
        
        return fightersData.getAllFighters
            .filter((fighter: Fighter) => {
                const fullName = `${fighter.firstName} ${fighter.lastName}`.toLowerCase();
                return fullName.includes(fighterSearch.toLowerCase()) &&
                    !selectedFighters.some(f => f.id === fighter.id);
            })
            .slice(0, 10);
    }, [fightersData, fighterSearch, selectedFighters]);
    
    // Filter competitions based on search
    const filteredCompetitions = useMemo(() => {
        if (!competitionsData?.getAllCompetitionsMeta || !competitionSearch) return [];
        
        return competitionsData.getAllCompetitionsMeta
            .filter((competition: Competition) => {
                const name = competition.competitionName.toLowerCase();
                const shortName = competition.shortName?.toLowerCase() || '';
                return (name.includes(competitionSearch.toLowerCase()) || 
                        shortName.includes(competitionSearch.toLowerCase())) &&
                    !selectedCompetitions.some(c => c.id === competition.id);
            })
            .slice(0, 10);
    }, [competitionsData, competitionSearch, selectedCompetitions]);
    
    // Image upload handler for Quill editor
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file && file.type.startsWith('image/')) {
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Url = e.target?.result as string;
                    
                    // Store the file mapped to its base64 URL
                    setContentImages(prev => {
                        const newMap = new Map(prev);
                        newMap.set(base64Url, file);
                        return newMap;
                    });
                    
                    // Insert image into editor
                    const quill = (window as any).quill;
                    if (quill) {
                        const range = quill.getSelection(true);
                        quill.insertEmbed(range.index, 'image', base64Url);
                        quill.setSelection(range.index + 1);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    };

    // Video upload handler for Quill editor
    const videoHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'video/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (file && file.type.startsWith('video/')) {
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64Url = e.target?.result as string;
                    
                    // Store the file mapped to its base64 URL
                    setContentVideos(prev => {
                        const newMap = new Map(prev);
                        newMap.set(base64Url, file);
                        return newMap;
                    });
                    
                    // Insert video into editor as HTML
                    const quill = (window as any).quill;
                    if (quill) {
                        const range = quill.getSelection(true);
                        // Insert video as HTML element
                        const videoHtml = `<video controls style="max-width: 100%; height: auto;"><source src="${base64Url}" type="${file.type}"></video>`;
                        quill.clipboard.dangerouslyPasteHTML(range.index, videoHtml);
                        quill.setSelection(range.index + 1);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
    };

    // Rich text editor modules
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler,
                video: videoHandler
            }
        },
    }), []);
    
    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'align',
        'blockquote', 'code-block',
        'link', 'image', 'video'
    ];
    
    // Handle thumbnail selection
    const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnailFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setThumbnail(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Upload images and videos to S3 and replace base64 URLs with S3 URLs in content
    const uploadContentMediaToS3 = async (articleId: string, htmlContent: string): Promise<string> => {
        let updatedContent = htmlContent;
        
        // Upload all media (images and videos) and get a mapping of base64 URL -> S3 URL
        const urlMapping = new Map<string, string>();
        
        // Upload images
        for (const [base64Url, file] of Array.from(contentImages.entries())) {
            try {
                const formData = new FormData();
                formData.append('media', file);
                formData.append('articleId', articleId);
                
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                const response = await fetch(`${backendUrl}/api/upload/article-media`, {
                    method: 'POST',
                    body: formData,
                });
                
                const data = await response.json();
                
                if (response.ok && data.url) {
                    urlMapping.set(base64Url, data.url);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }
        
        // Upload videos
        for (const [base64Url, file] of Array.from(contentVideos.entries())) {
            try {
                const formData = new FormData();
                formData.append('media', file);
                formData.append('articleId', articleId);
                
                const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
                const response = await fetch(`${backendUrl}/api/upload/article-media`, {
                    method: 'POST',
                    body: formData,
                });
                
                const data = await response.json();
                
                if (response.ok && data.url) {
                    urlMapping.set(base64Url, data.url);
                }
            } catch (error) {
                console.error('Error uploading video:', error);
            }
        }
        
        // Replace all base64 URLs with S3 URLs
        for (const [base64Url, s3Url] of Array.from(urlMapping.entries())) {
            updatedContent = updatedContent.replace(new RegExp(base64Url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), s3Url);
        }
        
        return updatedContent;
    };
    
    // Handle tag input
    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const totalTags = tags.length + selectedCompetitions.length;
        if (e.key === 'Enter' && tagInput.trim() && totalTags < 5) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };
    
    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };
    
    // Handle fighter selection
    const handleFighterSelect = (fighter: Fighter) => {
        setSelectedFighters([...selectedFighters, fighter]);
        setFighterSearch('');
        setShowFighterDropdown(false);
    };
    
    const removeFighter = (fighterId: string) => {
        setSelectedFighters(selectedFighters.filter(f => f.id !== fighterId));
    };
    
    // Handle competition selection
    const handleCompetitionSelect = (competition: Competition) => {
        setSelectedCompetitions([...selectedCompetitions, competition]);
        setCompetitionSearch('');
        setShowCompetitionDropdown(false);
    };
    
    const removeCompetition = (competitionId: string) => {
        setSelectedCompetitions(selectedCompetitions.filter(c => c.id !== competitionId));
    };
    
    // Upload thumbnail to S3
    const uploadThumbnailToS3 = async (articleId: string): Promise<string | null> => {
        if (!thumbnailFile) return null;
        
        const formData = new FormData();
        formData.append('thumbnail', thumbnailFile);
        formData.append('articleId', articleId);
        
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/upload/article-thumbnail`, {
                method: 'POST',
                body: formData,
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to upload thumbnail');
            }
            
            return data.url;
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            throw error;
        }
    };
    
    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim() || !subtitle.trim() || !content.trim() || !author.trim()) {
            alert('Please fill in all required fields (Title, Subtitle, Author, and Content)');
            return;
        }
        
        // Combine regular tags with competition tags
        const competitionTags = selectedCompetitions.map(c => c.shortName || c.competitionName);
        const allTags = [...tags, ...competitionTags];
        
        // Create the article data object
        const articleData = {
            title: title.trim(),
            subtitle: subtitle.trim(),
            blurb: blurb.trim() || undefined,
            author: author.trim(),
            content: content,
            thumbnail: thumbnail || undefined,
            thumbnailFile: thumbnailFile ? {
                name: thumbnailFile.name,
                size: thumbnailFile.size,
                type: thumbnailFile.type
            } : undefined,
            contentImagesCount: contentImages.size,
            contentVideosCount: contentVideos.size,
            tags: allTags.length > 0 ? allTags : undefined,
            competitionsTagged: selectedCompetitions.length > 0 
                ? selectedCompetitions.map(c => ({ id: c.id, name: c.competitionName }))
                : undefined,
            publishedDate: new Date().toISOString(),
            fightersTagged: selectedFighters.length > 0 
                ? selectedFighters.map(f => ({ id: f.id, name: `${f.firstName} ${f.lastName}` }))
                : undefined,
        };
        
        // Console log the article data
        console.log('==================== ARTICLE DATA ====================');
        console.log(JSON.stringify(articleData, null, 2));
        console.log('=====================================================');
        
        // Also log it in a more readable format
        console.log('\n📝 Article Preview:');
        console.log('Title:', articleData.title);
        console.log('Subtitle:', articleData.subtitle);
        console.log('Author:', articleData.author);
        if (articleData.blurb) console.log('Blurb:', articleData.blurb);
        console.log('Content Length:', articleData.content.length, 'characters');
        console.log('Content Images:', contentImages.size, 'image(s) to upload to S3');
        console.log('Content Videos:', contentVideos.size, 'video(s) to upload to S3');
        console.log('Thumbnail:', articleData.thumbnail ? 'Yes (preview only)' : 'None');
        if (articleData.thumbnailFile) {
            console.log('Thumbnail File:', articleData.thumbnailFile.name, `(${Math.round(articleData.thumbnailFile.size / 1024)}KB)`);
        }
        if (articleData.tags && articleData.tags.length > 0) {
            console.log('Tags:', articleData.tags.join(', '));
        }
        if (articleData.competitionsTagged && articleData.competitionsTagged.length > 0) {
            console.log('Tagged Competitions:', articleData.competitionsTagged.map((c: any) => c.name).join(', '));
        }
        if (articleData.fightersTagged && articleData.fightersTagged.length > 0) {
            console.log('Tagged Fighters:', articleData.fightersTagged.map((f: any) => f.name).join(', '));
        }
        console.log('Published Date:', new Date(articleData.publishedDate).toLocaleString());
        
        // Show content images info
        if (contentImages.size > 0) {
            console.log('\n🖼️ Content Images (will be uploaded to S3 on publish):');
            let imageIndex = 1;
            for (const [base64Url, file] of Array.from(contentImages.entries())) {
                console.log(`  ${imageIndex}. ${file.name} (${Math.round(file.size / 1024)}KB)`);
                imageIndex++;
            }
        }
        
        // Show content videos info
        if (contentVideos.size > 0) {
            console.log('\n🎥 Content Videos (will be uploaded to S3 on publish):');
            let videoIndex = 1;
            for (const [base64Url, file] of Array.from(contentVideos.entries())) {
                console.log(`  ${videoIndex}. ${file.name} (${Math.round(file.size / 1024)}KB)`);
                videoIndex++;
            }
        }
        
        console.log('\n✅ Article data logged to console! Check above for full JSON.');
        
        // Show publishing toast
        const publishingToast = toast.loading('Publishing article...');
        
        try {
            setIsUploading(true);
            
            // Step 1: Create a temporary article ID first
            const tempArticleId = `temp-${Date.now()}`;
            
            // Step 2: Upload content media BEFORE creating the article
            let finalContent = content;
            if (contentImages.size > 0 || contentVideos.size > 0) {
                toast.update(publishingToast, { 
                    render: `Uploading ${contentImages.size + contentVideos.size} media file(s) to S3...`,
                    isLoading: true 
                });
                
                // Create temporary article for uploads
                const { data: tempData } = await createArticle({
                    variables: {
                        input: {
                            title: `TEMP-${Date.now()}`,
                            subtitle: 'Temporary',
                            author: author.trim(),
                            content: 'Temporary content',
                            publishedDate: new Date().toISOString(),
                        },
                    },
                });
                
                const uploadArticleId = tempData?.createArticle?.id;
                
                if (uploadArticleId) {
                    // Upload all media and get updated content with S3 URLs
                    finalContent = await uploadContentMediaToS3(uploadArticleId, content);
                    console.log('Content media uploaded, S3 URLs replaced');
                }
            }
            
            // Step 3: Upload thumbnail if exists
            let thumbnailUrl = null;
            if (thumbnailFile) {
                toast.update(publishingToast, { 
                    render: 'Uploading thumbnail...',
                    isLoading: true 
                });
                
                // Use same article ID for thumbnail
                const { data: tempData2 } = await createArticle({
                    variables: {
                        input: {
                            title: `TEMP-THUMB-${Date.now()}`,
                            subtitle: 'Temporary',
                            author: author.trim(),
                            content: 'Temporary content',
                            publishedDate: new Date().toISOString(),
                        },
                    },
                });
                
                const thumbArticleId = tempData2?.createArticle?.id;
                if (thumbArticleId) {
                    thumbnailUrl = await uploadThumbnailToS3(thumbArticleId);
                    console.log('Thumbnail uploaded:', thumbnailUrl);
                    
                    // Delete the temporary article after thumbnail upload
                    try {
                        await deleteArticle({
                            variables: { id: thumbArticleId }
                        });
                        console.log('Temporary article deleted:', thumbArticleId);
                    } catch (deleteError) {
                        console.error('Failed to delete temporary article:', deleteError);
                        // Don't fail the article creation if deletion fails
                    }
                }
            }
            
            // Step 4: Now create the actual article with S3 URLs already in content
            toast.update(publishingToast, { 
                render: 'Creating article...',
                isLoading: true 
            });
            
            const { data } = await createArticle({
                variables: {
                    input: {
                        title: title.trim(),
                        subtitle: subtitle.trim(),
                        blurb: blurb.trim() || undefined,
                        author: author.trim(),
                        content: finalContent, // Content now has S3 URLs instead of base64
                        thumbnail: thumbnailUrl || undefined,
                        tags: allTags.length > 0 ? allTags : undefined,
                        publishedDate: new Date().toISOString(),
                        fightersTagged: selectedFighters.length > 0 
                            ? selectedFighters.map(f => f.id) 
                            : undefined,
                        competitionsTagged: selectedCompetitions.length > 0 
                            ? selectedCompetitions.map(c => c.id) 
                            : undefined,
                    },
                },
            });
            
            const articleId = data?.createArticle?.id;
            
            if (!articleId) {
                throw new Error('Failed to create article: No article ID returned');
            }
            
            // Success toast
            toast.update(publishingToast, {
                render: 'Article published successfully! Navigating to articles page...',
                type: 'success',
                isLoading: false,
                autoClose: 3000,
            });
            
            // Navigate to the articles page
            setTimeout(() => {
                setIsUploading(false);
                navigate('/articles');
            }, 2000);
            
        } catch (error: any) {
            console.error('Error creating article:', error);
            
            // Error toast
            toast.update(publishingToast, {
                render: `Failed to publish article: ${error.message || 'Please try again later'}`,
                type: 'error',
                isLoading: false,
                autoClose: 5000,
            });
            
            setIsUploading(false);
        }
    };
    
    const handleCancel = () => {
        if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
            navigate('/articles');
        }
    };
    
    return (
        <div className={styles.createArticlePage}>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Create New Article</h1>
                <button className={styles.cancelButton} onClick={handleCancel} type="button">
                    Cancel
                </button>
            </div>
            
            <form className={styles.form} onSubmit={handleSubmit}>
                {/* Title */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Title<span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter article title"
                        required
                    />
                </div>
                
                {/* Subtitle */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Subtitle<span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Enter article subtitle"
                        required
                    />
                </div>
                
                {/* Author */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Author<span className={styles.required}>*</span>
                    </label>
                    <input
                        type="text"
                        className={styles.input}
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Enter author name"
                        required
                    />
                </div>
                
                {/* Blurb */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Blurb</label>
                    <textarea
                        className={styles.textarea}
                        value={blurb}
                        onChange={(e) => setBlurb(e.target.value)}
                        placeholder="Short description for article preview (optional)"
                        rows={3}
                    />
                    <p className={styles.helpText}>
                        A brief summary that will appear in the article list
                    </p>
                </div>
                
                {/* Thumbnail */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Thumbnail</label>
                    {!thumbnail ? (
                        <div className={styles.uploadSection}>
                            <div
                                className={styles.uploadButton}
                                onClick={() => thumbnailInputRef.current?.click()}
                            >
                                <FontAwesomeIcon icon={faImage} className={styles.uploadIcon} />
                                <span className={styles.uploadText}>Upload Thumbnail</span>
                                <span className={styles.uploadSubtext}>Recommended: 16:9 ratio</span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.thumbnailPreview}>
                            <img src={thumbnail} alt="Thumbnail preview" className={styles.thumbnailImage} />
                            <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => {
                                    setThumbnail('');
                                    setThumbnailFile(null);
                                }}
                            >
                                <FontAwesomeIcon icon={faTimes} /> Remove
                            </button>
                        </div>
                    )}
                    <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className={styles.hiddenInput}
                    />
                </div>
                
                {/* Content Editor */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Content<span className={styles.required}>*</span>
                    </label>
                    <div className={styles.editorContainer}>
                        <ReactQuill
                            ref={(el) => {
                                if (el) {
                                    (window as any).quill = el.getEditor();
                                }
                            }}
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={modules}
                            formats={formats}
                            placeholder="Write your article content here..."
                            readOnly={isUploading}
                        />
                    </div>
                    <p className={styles.helpText}>
                        Click the image or video icons in the toolbar to add media. All media will be uploaded to S3 when you publish.
                        {(contentImages.size > 0 || contentVideos.size > 0) && 
                            ` (${contentImages.size} image(s) and ${contentVideos.size} video(s) ready to upload)`}
                    </p>
                </div>
                
                {/* Competitions */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Tag Competitions</label>
                    <div className={styles.fighterSearchContainer}>
                        <input
                            type="text"
                            className={styles.fighterSearchInput}
                            value={competitionSearch}
                            onChange={(e) => {
                                setCompetitionSearch(e.target.value);
                                setShowCompetitionDropdown(true);
                            }}
                            onFocus={() => setShowCompetitionDropdown(true)}
                            placeholder="Search for competitions to tag..."
                        />
                        {showCompetitionDropdown && filteredCompetitions.length > 0 && (
                            <div className={styles.fighterDropdown}>
                                {filteredCompetitions.map((competition: Competition) => (
                                    <div
                                        key={competition.id}
                                        className={styles.fighterOption}
                                        onClick={() => handleCompetitionSelect(competition)}
                                    >
                                        {competition.competitionName} {competition.shortName && `(${competition.shortName})`}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedCompetitions.length > 0 && (
                        <div className={styles.selectedFighters}>
                            {selectedCompetitions.map((competition) => (
                                <span key={competition.id} className={styles.selectedFighterChip}>
                                    {competition.shortName || competition.competitionName}
                                    <FontAwesomeIcon
                                        icon={faTimes}
                                        className={styles.tagRemove}
                                        onClick={() => removeCompetition(competition.id)}
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                    <p className={styles.helpText}>
                        Competitions will be added as tags automatically
                    </p>
                </div>

                {/* Tags */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Additional Tags (max 5 total)</label>
                    <div className={styles.tagsInput}>
                        {tags.map((tag, index) => (
                            <span key={index} className={styles.tag}>
                                {tag}
                                <FontAwesomeIcon
                                    icon={faTimes}
                                    className={styles.tagRemove}
                                    onClick={() => removeTag(index)}
                                />
                            </span>
                        ))}
                        {(tags.length + selectedCompetitions.length) < 5 && (
                            <input
                                type="text"
                                className={styles.tagInputField}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder={tags.length === 0 ? "Type a tag and press Enter" : "Add another tag..."}
                            />
                        )}
                    </div>
                    <p className={styles.tagLimit}>
                        {tags.length + selectedCompetitions.length}/5 tags used (including {selectedCompetitions.length} competition tag{selectedCompetitions.length !== 1 ? 's' : ''})
                    </p>
                </div>
                
                {/* Fighter Tagging */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Tag Fighters</label>
                    <div className={styles.fighterSearchContainer}>
                        <input
                            type="text"
                            className={styles.fighterSearchInput}
                            value={fighterSearch}
                            onChange={(e) => {
                                setFighterSearch(e.target.value);
                                setShowFighterDropdown(true);
                            }}
                            onFocus={() => setShowFighterDropdown(true)}
                            placeholder="Search for fighters to tag..."
                        />
                        {showFighterDropdown && filteredFighters.length > 0 && (
                            <div className={styles.fighterDropdown}>
                                {filteredFighters.map((fighter: Fighter) => (
                                    <div
                                        key={fighter.id}
                                        className={styles.fighterOption}
                                        onClick={() => handleFighterSelect(fighter)}
                                    >
                                        <div className={styles.fighterThumbnail}>
                                            {fighter.profileImage ? (
                                                <S3Image
                                                    src={fighter.profileImage}
                                                    alt={`${fighter.firstName} ${fighter.lastName}`}
                                                    className={styles.fighterImage}
                                                />
                                            ) : (
                                                <div className={styles.fighterPlaceholder}>
                                                    <FontAwesomeIcon icon={faUser} />
                                                </div>
                                            )}
                                        </div>
                                        <span>{fighter.firstName} {fighter.lastName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedFighters.length > 0 && (
                        <div className={styles.selectedFighters}>
                            {selectedFighters.map((fighter) => (
                                <span key={fighter.id} className={styles.selectedFighterChip}>
                                    <div className={styles.fighterThumbnailSmall}>
                                        {fighter.profileImage ? (
                                            <S3Image
                                                src={fighter.profileImage}
                                                alt={`${fighter.firstName} ${fighter.lastName}`}
                                                className={styles.fighterImageSmall}
                                            />
                                        ) : (
                                            <div className={styles.fighterPlaceholderSmall}>
                                                <FontAwesomeIcon icon={faUser} />
                                            </div>
                                        )}
                                    </div>
                                    <span>{fighter.firstName} {fighter.lastName}</span>
                                    <FontAwesomeIcon
                                        icon={faTimes}
                                        className={styles.tagRemove}
                                        onClick={() => removeFighter(fighter.id)}
                                    />
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className={styles.formActions}>
                    <button
                        type="button"
                        className={styles.resetButton}
                        onClick={() => {
                            if (window.confirm('Are you sure you want to reset the form? All content will be lost.')) {
                                setTitle('');
                                setSubtitle('');
                                setBlurb('');
                                setAuthor('');
                                setContent('');
                                setThumbnail('');
                                setThumbnailFile(null);
                                setTags([]);
                                setSelectedFighters([]);
                                setSelectedCompetitions([]);
                                setContentImages(new Map());
                                setContentVideos(new Map());
                            }
                        }}
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={creating || isUploading}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Publish Article
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateArticlePage;


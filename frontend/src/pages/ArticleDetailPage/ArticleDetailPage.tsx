import React from 'react';
import { useQuery } from '@apollo/client';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendar, faNewspaper, faUsers, faTags, faUser } from '@fortawesome/free-solid-svg-icons';
import { GET_ARTICLE } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './ArticleDetailPage.module.css';

interface Fighter {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
}

interface CompetitionMeta {
    id: string;
    competitionName: string;
    logo: string;
}

interface Competition {
    id: string;
    competitionMeta?: CompetitionMeta;
}

interface Article {
    id: string;
    title: string;
    subtitle: string;
    blurb?: string;
    content: string;
    thumbnail?: string;
    author: string;
    tags?: string[];
    publishedDate: string;
    fightersTagged?: string[];
    fighters?: Fighter[];
    competitionsTagged?: string[];
    competitions?: Competition[];
}

const ArticleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { loading, error, data } = useQuery<{ getArticle: Article }>(GET_ARTICLE, {
        variables: { id },
    });

    const handleBack = () => {
        navigate('/articles');
    };

    const handleFighterClick = (fighterId: string) => {
        navigate(`/fighter/${fighterId}`);
    };

    const handleCompetitionClick = (competitionId: string) => {
        navigate(`/competition/${competitionId}`);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className={styles.articleDetailPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faNewspaper} spin size="3x" />
                    <p>Loading article...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.articleDetailPage}>
                <button className={styles.backButton} onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to Articles
                </button>
                <div className={styles.error}>
                    <p>Error loading article: {error.message}</p>
                </div>
            </div>
        );
    }

    const article = data?.getArticle;

    if (!article) {
        return (
            <div className={styles.articleDetailPage}>
                <button className={styles.backButton} onClick={handleBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to Articles
                </button>
                <div className={styles.error}>
                    <p>Article not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.articleDetailPage}>
            <button className={styles.backButton} onClick={handleBack}>
                <FontAwesomeIcon icon={faArrowLeft} /> Back to Articles
            </button>

            <article className={styles.article}>
                {article.thumbnail && (
                    <div className={styles.thumbnailContainer}>
                        <S3Image
                            src={article.thumbnail}
                            alt={article.title}
                            className={styles.thumbnail}
                            disableHoverScale={true}
                        />
                    </div>
                )}

                {!article.thumbnail && (
                    <div className={styles.thumbnailContainer}>
                        <div className={styles.noThumbnail}>
                            <FontAwesomeIcon icon={faNewspaper} />
                        </div>
                    </div>
                )}

                <div className={styles.articleHeader}>
                    <h1 className={styles.articleTitle}>{article.title}</h1>
                    <p className={styles.articleSubtitle}>{article.subtitle}</p>
                    <p className={styles.articleAuthor}>By {article.author}</p>

                    <div className={styles.articleMeta}>
                        <div className={styles.metaItem}>
                            <FontAwesomeIcon icon={faCalendar} className={styles.metaIcon} />
                            <span>{formatDate(article.publishedDate)}</span>
                        </div>

                        {article.tags && article.tags.length > 0 && (
                            <div className={styles.metaItem}>
                                <FontAwesomeIcon icon={faTags} className={styles.metaIcon} />
                                <span>{article.tags.length} tag{article.tags.length !== 1 ? 's' : ''}</span>
                            </div>
                        )}

                        {article.fightersTagged && article.fightersTagged.length > 0 && (
                            <div className={styles.metaItem}>
                                <FontAwesomeIcon icon={faUsers} className={styles.metaIcon} />
                                <span>{article.fightersTagged.length} fighter{article.fightersTagged.length !== 1 ? 's' : ''} tagged</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.articleBody}>
                    <div
                        className={styles.articleContent}
                        dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                </div>

                {article.tags && article.tags.length > 0 && (
                    <div className={styles.tags}>
                        {article.tags.map((tag, index) => (
                            <span key={index} className={styles.tag}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {article.fighters && article.fighters.length > 0 && (
                    <div className={styles.taggedFighters}>
                        <h3 className={styles.sectionTitle}>Tagged Fighters</h3>
                        <div className={styles.fightersList}>
                            {article.fighters.map((fighter) => (
                                <div
                                    key={fighter.id}
                                    className={styles.fighterChip}
                                    onClick={() => handleFighterClick(fighter.id)}
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
                    </div>
                )}

                {article.competitions && article.competitions.length > 0 && (
                    <div className={styles.taggedCompetitions}>
                        <h3 className={styles.sectionTitle}>Tagged Competitions</h3>
                        <div className={styles.competitionsList}>
                            {article.competitions.map((competition) => (
                                <div
                                    key={competition.id}
                                    className={styles.competitionChip}
                                    onClick={() => handleCompetitionClick(competition.id)}
                                >
                                    <div className={styles.competitionThumbnail}>
                                        {competition.competitionMeta?.logo ? (
                                            <S3Image
                                                src={competition.competitionMeta.logo}
                                                alt={competition.competitionMeta.competitionName}
                                                className={styles.competitionImage}
                                            />
                                        ) : (
                                            <div className={styles.competitionPlaceholder}>
                                                <FontAwesomeIcon icon={faNewspaper} />
                                            </div>
                                        )}
                                    </div>
                                    <span>{competition.competitionMeta?.competitionName || 'Unknown Competition'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </article>
        </div>
    );
};

export default ArticleDetailPage;


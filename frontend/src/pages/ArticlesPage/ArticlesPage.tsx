import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faUsers, faPlus } from '@fortawesome/free-solid-svg-icons';
import { GET_ALL_ARTICLES } from '../../services/queries';
import S3Image from '../../components/S3Image/S3Image';
import styles from './ArticlesPage.module.css';

interface Article {
    id: string;
    title: string;
    subtitle: string;
    blurb?: string;
    thumbnail?: string;
    author: string;
    tags?: string[];
    publishedDate: string;
    fightersTagged?: string[];
}

interface ArticlesResponse {
    results: Article[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        count: number;
        has_next: boolean;
        has_previous: boolean;
    };
}

const ArticlesPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 12;

    const { loading, error, data } = useQuery<{ getAllArticles: ArticlesResponse }>(
        GET_ALL_ARTICLES,
        {
            variables: { page: currentPage, limit },
        }
    );

    const handleArticleClick = (articleId: string) => {
        navigate(`/articles/${articleId}`);
    };

    const handleCreateArticle = () => {
        navigate('/articles/create');
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNextPage = () => {
        if (data?.getAllArticles.pagination.has_next) {
            setCurrentPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
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
            <div className={styles.articlesPage}>
                <div className={styles.loading}>
                    <FontAwesomeIcon icon={faNewspaper} spin size="3x" />
                    <p>Loading articles...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.articlesPage}>
                <div className={styles.error}>
                    <p>Error loading articles: {error.message}</p>
                </div>
            </div>
        );
    }

    const articles = data?.getAllArticles.results || [];
    const pagination = data?.getAllArticles.pagination;

    if (articles.length === 0) {
        return (
            <div className={styles.articlesPage}>
                <div className={styles.header}>
                    <h1 className={styles.pageTitle}>Articles</h1>
                    <button className={styles.createButton} onClick={handleCreateArticle}>
                        <FontAwesomeIcon icon={faPlus} /> Create Article
                    </button>
                </div>
                <div className={styles.emptyState}>
                    <FontAwesomeIcon icon={faNewspaper} size="3x" />
                    <p>No articles found. Create your first article!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.articlesPage}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Articles</h1>
                <button className={styles.createButton} onClick={handleCreateArticle}>
                    <FontAwesomeIcon icon={faPlus} /> Create Article
                </button>
            </div>

            <div className={styles.articleGrid}>
                {articles.map((article) => (
                    <div
                        key={article.id}
                        className={styles.articleCard}
                        onClick={() => handleArticleClick(article.id)}
                    >
                        <div className={styles.thumbnailContainer}>
                            {article.thumbnail ? (
                                <S3Image
                                    src={article.thumbnail}
                                    alt={article.title}
                                    className={styles.thumbnail}
                                />
                            ) : (
                                <div className={styles.noThumbnail}>
                                    <FontAwesomeIcon icon={faNewspaper} />
                                </div>
                            )}
                        </div>

                        <div className={styles.articleContent}>
                            <h2 className={styles.articleTitle}>{article.title}</h2>
                            <p className={styles.articleSubtitle}>{article.subtitle}</p>
                            {article.blurb && (
                                <p className={styles.articleBlurb}>{article.blurb}</p>
                            )}

                            {article.tags && article.tags.length > 0 && (
                                <div className={styles.tags}>
                                    {article.tags.slice(0, 3).map((tag, index) => (
                                        <span key={index} className={styles.tag}>
                                            {tag}
                                        </span>
                                    ))}
                                    {article.tags.length > 3 && (
                                        <span className={styles.tag}>+{article.tags.length - 3}</span>
                                    )}
                                </div>
                            )}

                            <div className={styles.articleFooter}>
                                <div>
                                    <div className={styles.authorName}>By {article.author}</div>
                                    <span className={styles.publishDate}>
                                        {formatDate(article.publishedDate)}
                                    </span>
                                </div>
                                {article.fightersTagged && article.fightersTagged.length > 0 && (
                                    <span className={styles.fighterCount}>
                                        <FontAwesomeIcon icon={faUsers} />
                                        {article.fightersTagged.length} fighter{article.fightersTagged.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination && pagination.total > limit && (
                <div className={styles.pagination}>
                    <button
                        className={styles.pageButton}
                        onClick={handlePreviousPage}
                        disabled={!pagination.has_previous}
                    >
                        Previous
                    </button>
                    <span className={styles.pageInfo}>
                        Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button
                        className={styles.pageButton}
                        onClick={handleNextPage}
                        disabled={!pagination.has_next}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ArticlesPage;


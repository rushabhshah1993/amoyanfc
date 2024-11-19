/* Package imports */
import { GraphQLDate, GraphQLPositiveInt } from 'graphql-scalars';

/* Model imports */
import { Articles } from './../models/articles.model.js';

/* Error imports */
import { NotFoundError } from './../error.js';

const articleResolvers = {
    Date: GraphQLDate,
    Number: GraphQLPositiveInt,

    Query: {
        /**
         * Fetches a paginated list of all the articles based on query parameters
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments for this query 
         * @param {Number} args.page - Denotes the current page number (Default is 1)
         * @param {Number} args.limit - Denotes the number of items per page (Default is 10)
         * @param {Object} args.query - Denotes the optional query object to filter results
         * @returns {Promise<Object>} - Paginated articles and metadata
         * @throws {NotFoundError} - This error is thrown if no articles are found.
         * @throws {Error} - This error is thrown if general errors are thrown.
         */
        getAllArticles: async(_, { page = 1, limit = 10, query = {} }) => {
            try {
                const queryObj = query ? createQueryObj(query) : {};
                const pageNumber = parseInt(page);
                const pageLimit = parseInt(limit);
                const skipIndex = (pageNumber - 1) * pageLimit;

                const relevantArticlesCount = await Articles.countDocuments(queryObj);

                const articles = await Articles.find(queryObj)
                    .sort({ created_at: -1 })
                    .limit(pageLimit)
                    .skip(skipIndex);

                if (!articles.length) {
                    throw new NotFoundError("Articles not found");
                }

                const has_next = skipIndex + articles.length < relevantArticlesCount;

                return {
                    results: articles,
                    pagination: {
                      page: pageNumber,
                      limit: pageLimit,
                      total: relevantArticlesCount,
                      count: articles.length,
                      has_next,
                      has_previous: skipIndex > 0
                    }
                };
            }
            catch(error) {
                console.error("Unexpected error:", error);
                throw new Error("Internal server error");
            }
        },

        /**
         * Fetches a single article based on the ID provided
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments containing article ID. 
         * @param {String} args.id - Denotes the ID of the article to be retrieved.
         * @returns {Promise<Object>} - The article object
         */
        getArticle: async(_, { id }) => {
            try {
                const article = Articles.findById(id);
                if(!article) {
                    throw new NotFoundError("Article not found");
                }
                return article;
            }
            catch(error) {
                console.error(error);
                throw new Error("Error fetching article");
            }
        }
    },
    Mutation: {
        /**
         * Creating a new article
         * @param {*} _ - Unused parent resolver
         * @param {*} args - Arguments for this mutation containing article data
         * @returns {Promise<Object>} - Returns the newly created article
         * @throws {Error} - If an error is encountered during the article creation.
         */
        createArticle: async(_, args) => {
            try {
                const newArticle = new Articles(...args);
                return await newArticle.save();
            }
            catch(error) {
                console.error("Error creating article:", error);
                throw new Error("Error creating article");
            }
        },

        /**
         * Updates and edits an existing article based on its id
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments containing the article ID and update data.
         * @param {String} args.id - The ID of the article to update
         * @param {Object} args.input - The update data for the article.
         * @returns {Promise<object>} - The updated article object.
         * @throws {NotFoundError} - If the article is not found.
         * @throws {Error} - If an error occurs during article update.
         */
        editArticle: async(_, {id, input}) => {
            try {
                let updatedArticle = await Articles.findByIdAndUpdate(id, input, { new: true });
                if(!updatedArticle) {
                    throw new NotFoundError("Article not found");
                }
                return updatedArticle;
            }
            catch(error) {
                console.error("Error updating article:", error);
                throw new Error("Error updating article");
            }
        },

        /**
         * Deletes an article by its ID.
         * @param {Object} _ - Unused parent resolver
         * @param {Object} args - Arguments containing the article ID.
         * @param {String} args.id - The ID of the article to delete.
         * @returns {Promise<object>} - The deleted article object.
         * @throws {NotFoundError} - If the article is not found.
         * @throws {Error} - If an error occurs during article deletion.
         */
        deleteArticle: async(_, { id }) => {
            try {
                let deletedArticle = await Articles.findOneAndDelete(id);
                if(!deletedArticle) {
                    throw new NotFoundError("Article not found");
                }
                return deletedArticle;
            } 
            catch(error) {
                console.error("Error deleting article:", error);
                throw new Error("Error deleting article");
            }
        }
    }
}

export default articleResolvers;

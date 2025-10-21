const articleTypeDef = `#graphql
    scalar Date

    """
    Pagination metadata
    """
    type PaginationInfo {
        page: Int!
        limit: Int!
        total: Int!
        count: Int!
        has_next: Boolean!
        has_previous: Boolean!
    }

    """
    Paginated articles response
    """
    type ArticlesResponse {
        results: [Article!]!
        pagination: PaginationInfo!
    }

    """
    Represents a single article
    """
    type Article {
        """
        Represents the unique ID of an article
        """
        id: ID!

        """
        Represents the title of the article
        """
        title: String!

        """
        Represents the subtitle of the article
        """
        subtitle: String!

        """
        Represents the short blurb of the article that will be shown in highlights
        """
        blurb: String

        """
        Represents the HTML content of the article stored in the format of a string
        """
        content: String!

        """
        Represents the URL denoting the thumbnail of the article
        """
        thumbnail: String

        """
        Represents the author name of the article
        """
        author: String!

        """
        Represents the list of tags associated with an article
        """
        tags: [String]

        """
        Represents the date on which the article was published
        """
        publishedDate: Date!

        """
        Represents a list of fighters by their IDs, if they are tagged in the article
        """
        fightersTagged: [String]

        """
        Represents the full fighter objects for fighters tagged in the article
        """
        fighters: [Fighter]

        """
        Represents a list of competitions by their IDs, if they are tagged in the article
        """
        competitionsTagged: [String]

        """
        Represents the full competition objects for competitions tagged in the article
        """
        competitions: [Competition]
    }

    """
    Query root for fetching data.
    """
    type Query {
        """
        Query to fetch an individiual article
        """
        getArticle(id: ID!): Article

        """
        Query to fetch the entire list of articles with pagination
        """
        getAllArticles(page: Int, limit: Int): ArticlesResponse!
    }

    """
    Root mutation for modifying data.
    """
    type Mutation {
        """
        Creates a new article in the system
        """
        createArticle(input: NewArticleInput!): Article!

        """
        Edits an existing article from the system
        """
        editArticle(id: ID!, input: ExistingArticleInput!): Article!

        """
        Deletes an existing article from the system
        """
        deleteArticle(id: ID!): Article
    }

    """
    Input type for fetching paginated results of articles
    """
    input PageParamsInput {
        """
        Denotes the page number to be fetched
        """
        page: Int

        """
        Denotes the number of articles to be sent in response for a particular page
        """
        limit: Int
    }

    """
    Input type for adding a new article in the system
    """
    input NewArticleInput {
        """
        Represents the title of the article
        """
        title: String!

        """
        Represents the subtitle of the article
        """
        subtitle: String!

        """
        Represents the short blurb of the article that will be shown in highlights. Optional in nature.
        """
        blurb: String

        """
        Represents the HTML content of the article stored in the format of a string
        """
        content: String!

        """
        Represents the URL denoting the thumbnail of the article. Optional in nature.
        """
        thumbnail: String

        """
        Represents the author name of the article
        """
        author: String!

        """
        Represents the list of tags associated with an article. Optional in nature.
        """
        tags: [String]

        """
        Represents the date on which the article was published.
        """
        publishedDate: Date!

        """
        Represents a list of fighters by their IDs, if they are tagged in the article. Optional in nature.
        """
        fightersTagged: [String]

        """
        Represents a list of competitions by their IDs, if they are tagged in the article. Optional in nature.
        """
        competitionsTagged: [String]
    }

    """
    Input type for updating an existing article in the system
    """
    input ExistingArticleInput {
        """
        Represents the title of the article
        """
        title: String!

        """
        Represents the subtitle of the article
        """
        subtitle: String!

        """
        Represents the short blurb of the article that will be shown in highlights. Optional for update.
        """
        blurb: String

        """
        Represents the HTML content of the article stored in the format of a string
        """
        content: String!

        """
        Represents the URL denoting the thumbnail of the article. Optional for update.
        """
        thumbnail: String

        """
        Represents the author name of the article
        """
        author: String!

        """
        Represents the list of tags associated with an article. Optional for update.
        """
        tags: [String]

        """
        Represents a list of fighters by their IDs, if they are tagged in the article. Optional for update.
        """
        fightersTagged: [String]

        """
        Represents a list of competitions by their IDs, if they are tagged in the article. Optional for update.
        """
        competitionsTagged: [String]
    }
`;

export default articleTypeDef;

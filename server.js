import express from 'express';
import expressGraphql from 'express-graphql';
const { graphqlHTTP } = expressGraphql;

import graphql from 'graphql';
const {GraphQLSchema, 
    GraphQLObjectType, 
    GraphQLString, 
    GraphQLList, 
    GraphQLInt, 
    GraphQLNonNull } = graphql;

import {authors, books} from './models.js';

const app = express();

// define new schema for graphql to use
// const schema = new GraphQLSchema({
//     query: new GraphQLObjectType({
//         name: 'HelloWorld',
//         fields: () => ({
//             // object that defines the type of this object
//             message: { 
//                 type: GraphQLString,
//                 resolve: () => 'hello world'
//             }
//         })
//     })
// });
const authorType = new GraphQLObjectType({

    name: 'Author',
    description: 'Author of a book',
    fields: () => ({
        id: { type: GraphQLNonNull(GraphQLInt) },
        name: {type: GraphQLNonNull(GraphQLString) },
        /**
         * add in new field so we can use the following query
         * query{
            authors {
                id
                name
                books {
                    name
                }
            }
            }
         */
        books: {
            type: new GraphQLList(bookType),
            resolve: (author) => {
                return books.filter(book => book.authorId === author.id)
            }
        }
    })
});


const bookType = new GraphQLObjectType(
    {
        name: 'Book',
        description: 'Book written by an author',
        // use a function for fields because of circular dependency. authorType depends on bookType which depens on authorType
        // put all this in a function so that they're called on run time and author/book types are initialized
        fields: () => ({
            id: { type: GraphQLNonNull(GraphQLInt) },
            name: {type: GraphQLNonNull(GraphQLString) },
            authorId: {type: GraphQLNonNull(GraphQLInt) },
            /**
             * add a new field to reference the author from the authors model to make query like this
             * query{
                ` books {
                    id
                    name
                    author {
                        id
                        name
                    }
                }
            }`
             * 
             * need a custom resolver to get the author name and put it in this query
             * 
             * 
             */
            author: {
                // custom author type, need to define it
                type: authorType,
                resolve: (book) => {
                    return authors.find(author => author.id === book.authorId)
                }
            }          
        })
    }
)

// for the 'GET' requests of graphql
const rootQueryType = new GraphQLObjectType({
    name: 'Query',
    description: 'Root Query',
    fields: () => ({
        // what if we want one single author instead of all authors? WE can use arguments for our queries
        /**
         * {
                book(id: 1){
                    name
                }
            }
         */
        book: {
            type: bookType,
            description: 'single book',
            // pass in argument through the post request (use graphiql)
            args: {
                id: { type: GraphQLInt }
            },
            resolve: (parent, args) => books.find(book => book.id === args.id)
        },
        books: {
            // custom graphql object type, create BookType
            type: new GraphQLList(bookType),
            description: 'List of books',
            resolve: () => books
        },
        // add a new author query to retrieve the authors, similar to how we define a books query
        authors: {
            type: new GraphQLList(authorType),
            description: 'List of all authors',
            resolve: () => authors
        },
        // retrieve singlea uthor
        /**
         * {
                author(id: 1){
                    id,
                    name
                }
            }
         */
        author: {
            type: authorType,
            description: 'retrieve single author',
            args: {
                id: {type: GraphQLInt }
            },
            resolve: (parent, args) => authors.find(author => author.id === args.id)
        }
    })
});

const rootMutationType = new GraphQLObjectType({
    name: 'mutation',
    description: 'root mutation',
    fields: () => ({

        // mutation{
        //     addBook(name: "new name", authorId: 1){
        //       id
        //       name
        //     }
        //   }
        addBook: {
            type: bookType,
            description: 'add book to the database',
            args: {
                name: {type: GraphQLNonNull(GraphQLString)},
                authorId: { type: GraphQLNonNull(GraphQLInt)}
            },
            resolve: (parent, args) => {
                // function to create new book object and then add it t othe array (mocking database add)
                const newBook = {
                    id: books.length + 1, 
                    name: args.name, 
                    authorId: args.authorId
                }
                books.push(newBook);
                return newBook
            }
        },

        addAuthor: {
            type: authorType,
            description: 'add author to the database',
            args: {
                name: {type: GraphQLNonNull(GraphQLString)},
                authorId: { type: GraphQLNonNull(GraphQLInt)}
            },
            resolve: (parent, args) => {
                // function to create new book object and then add it t othe array (mocking database add)
                const newAuthor = {
                    id: authors.length + 1, 
                    name: args.name, 
                }
                authors.push(newAuthor);
                return newAuthor;
            }
        }
    })
});

const bookSchema = new GraphQLSchema({
    // for the 'get' requests
    query: rootQueryType,
    // want to modify our data, use mutations
    mutation: rootMutationType
}) 

app.get('/', (req, res) => {
    res.status(200).json("hello wrold");
});

app.use('/graphql', graphqlHTTP({
    schema: bookSchema,
    graphiql: true
}));

app.listen(1234, () => console.log("running on port 1234..."));
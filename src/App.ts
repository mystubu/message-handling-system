import dotenv from 'dotenv';
import express, {Express} from 'express';

dotenv.config();

import http from 'http';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import getDatabaseConfig from './configs/databaseConfig';
import DatabaseManager from './database/DatabaseManager';
import {Environment} from './enums/Environment'
import UserRouter from './routers/UserRouter';
import ConversationRouter from './routers/ConversationRouter';
import * as process from 'process';
import session from 'express-session';
import passport from 'passport';
import AuthRouter from './routers/AuthRouter';
import GoogleAuth from './services/authentication/GoogleAuth';
import {googleConfig} from './configs/GoogleConfig';

export default class StudyBuddyServer {
    public readonly app: Express;
    public readonly environment: string
    private server: http.Server;

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.environment = process.env.NODE_ENV as Environment || Environment.Development

        this.configurePassport();
        this.configureMiddlewares();
        this.configureRoutes();
    }

    private configurePassport(): void {
        new GoogleAuth(googleConfig, passport);
    }

    private configureMiddlewares(): void {
        this.app.use(cors({
            origin: process.env.STUDY_BUDDY_SPA_URL,
            methods: ['GET'],
            credentials: true,
        }));
        this.app.use(compression());
        this.app.use(cookieParser());
        this.app.use(bodyParser.json());
        this.app.use(session({secret: process.env.SESSION_SECRET || ''}));
        this.app.use(passport.initialize());
        this.app.use(passport.session());
    }

    private configureRoutes(): void {
        this.app.use('/auth', new AuthRouter(passport).getRouter());
        this.app.use('/user', new UserRouter().getRouter());
        this.app.use('/conversation', new ConversationRouter().getRouter());
        this.app.get('/', (req, res): void => {
            res.json({message: 'Hello from the Study Buddy backend.'});
        });
    }

    private async initializeDatabase(): Promise<void> {
        const dbManager: DatabaseManager = new DatabaseManager(getDatabaseConfig(this.environment));
        try {
            await dbManager.initialize();
        } catch (error) {
            console.error('Error during database initialization:', error);
            throw error;
        }
    }

    private startServer(): void {
        const port: string = process.env.PORT || '8080';

        this.server.listen(port, (): void => {
            console.log(`Server running on ${port}`);
        });
    }

    public async start(): Promise<void> {
        try {
            if (process.env.NODE_ENV !== 'test') {
                await this.initializeDatabase();
                this.startServer();
            }
        } catch (error) {
            console.error('Error during server startup:', error);
            process.exit(1); // Exit the process with an error code
        }
    }
}

// Create an instance of the server and start it
const studyBuddyServer = new StudyBuddyServer();
studyBuddyServer.start();

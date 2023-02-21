declare global{
    namespace NodeJS{
        interface ProcessEnv{
        FAUNA_DATABASE_SECRET: string;
        MONGO_DB_URL: string;
        }
    }
}

export {}
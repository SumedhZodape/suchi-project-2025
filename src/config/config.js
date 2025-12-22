const config = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
    dbUri:"mongodb+srv://pratikshapurhe551:pratiksha@cluster0.o1v0pc0.mongodb.net/RSSproject",
    // dbUri:"mongodb+srv://sumedh_db_user:WrgqI5HLyyXkpIjI@cluster0.nve7ild.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
};

export default config;

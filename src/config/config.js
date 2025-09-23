const config = {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
    dbUri:"mongodb+srv://pratikshapurhe551:pratiksha@cluster0.o1v0pc0.mongodb.net/RSSproject",
};

export default config;

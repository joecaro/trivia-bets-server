const { default: axios } = require("axios");

baseUrl = 'http://localhost:3001/games';


const clearDB = async () => {
    const games = await axios.get(baseUrl);
    console.log(games.data);
    games.data.forEach(async (game) => {
        await axios.delete(`${baseUrl}/${game.id}`);
    });

    console.log('DB cleared');
};

clearDB();
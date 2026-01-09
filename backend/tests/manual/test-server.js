import express from 'express';
import walletRoutes from './src/routes/walletRoutes.js';

const app = express();
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

app.use('/api/v1/wallet', walletRoutes);

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

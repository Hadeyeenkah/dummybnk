import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StockMarketPage from './StockMarketPage';
import { useBankContext } from '../context/BankContext';

jest.mock('../context/BankContext', () => ({
  useBankContext: jest.fn(),
}));

jest.mock('../config', () => ({
  API_BASE: '/api',
}));

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('StockMarketPage', () => {
  beforeEach(() => {
    useBankContext.mockReturnValue({
      currentUser: { checking: 750 },
      refreshProfile: jest.fn(),
    });
    global.fetch = jest.fn().mockResolvedValue(response({
      settings: {
        todaysReturn: 0,
        todaysReturnPercent: 10.5,
        estimatedTradeTotal: 0,
        marketStatus: 'closed',
        marketMessage: 'Trading is closed for maintenance.',
        watchlistChanges: [],
      },
      balance: { checking: 750, total: 1000 },
      // The page must normalize and retain its safe fallback instruments if
      // an older server sends an empty quote list.
      quotes: [],
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('shows normalized fallback movement and prevents orders while closed', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StockMarketPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/NYSE market closed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review buy/i })).toBeDisabled();
    // AAPL's fallback data is +1.24% at $228.87, a $2.80 move. Before quote
    // normalization, this incorrectly rendered as $0.00.
    expect(screen.getAllByText('($2.80)').length).toBeGreaterThan(0);
  });
});

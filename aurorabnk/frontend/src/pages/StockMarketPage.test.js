import { fireEvent, render, screen } from '@testing-library/react';
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

  test('requests admin approval before adding today’s return to checking', async () => {
    const marketOverview = {
      settings: {
        todaysReturn: 24.5,
        todaysReturnPercent: 10.5,
        estimatedTradeTotal: 233.33,
        marketStatus: 'open',
        marketMessage: 'Trading is open.',
        watchlistChanges: [],
      },
      balance: { checking: 750, total: 1000 },
      quotes: [],
      returnWithdrawal: null,
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response(marketOverview))
      .mockResolvedValueOnce(response({
        message: 'Return withdrawal submitted for admin approval.',
        returnWithdrawal: { id: 'withdrawal-1', amount: 24.5, status: 'pending' },
      }, 201))
      .mockResolvedValueOnce(response({
        ...marketOverview,
        returnWithdrawal: { id: 'withdrawal-1', amount: 24.5, status: 'pending' },
      }));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <StockMarketPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Request withdrawal' }));

    expect(await screen.findByText('Withdrawal request pending admin approval')).toBeInTheDocument();
    expect(global.fetch.mock.calls[1][0]).toBe('/api/market/return-withdrawal');
    expect(global.fetch.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    expect(global.fetch.mock.calls[1][1]).not.toHaveProperty('body');
    expect(screen.getByText('Checking balance').previousSibling).toHaveTextContent('$750.00');
  });
});

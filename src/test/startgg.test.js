const axios = require('axios');
const { getUpcomingTournamentsStartgg } = require('../utils/scrapers/startgg.js');

describe('startgg scraper error handling', () => {
  const originalEnv = process.env.STARTGG_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.STARTGG_KEY = originalEnv;
  });

  it('returns empty array when STARTGG_KEY is not defined', async () => {
    delete process.env.STARTGG_KEY;
    const res = await getUpcomingTournamentsStartgg(936, 10);
    expect(res).toEqual([]);
  });

  it('handles 401 Unauthorized (Token has expired) gracefully without throwing', async () => {
    process.env.STARTGG_KEY = 'expired-token';
    const err = new Error('Request failed with status code 401');
    err.response = {
      status: 401,
      statusText: 'Unauthorized',
      data: { success: false, message: 'Token has expired.' }
    };
    vi.spyOn(axios, 'post').mockRejectedValue(err);

    const res = await getUpcomingTournamentsStartgg(936, 10);
    expect(res).toEqual([]);
  });

  it('handles network errors gracefully without throwing', async () => {
    process.env.STARTGG_KEY = 'valid-token';
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'));

    const res = await getUpcomingTournamentsStartgg(936, 10);
    expect(res).toEqual([]);
  });

  it('handles GraphQL response with errors gracefully', async () => {
    process.env.STARTGG_KEY = 'valid-token';
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        errors: [{ message: 'Rate limit exceeded' }]
      }
    });

    const res = await getUpcomingTournamentsStartgg(936, 10);
    expect(res).toEqual([]);
  });

  it('formats tournaments correctly when response is successful', async () => {
    process.env.STARTGG_KEY = 'valid-token';
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        data: {
          tournaments: {
            nodes: [
              {
                id: '123',
                name: 'Test Cup #1',
                slug: 'test-cup-1',
                startAt: 1760000000,
                images: [{ url: 'https://example.com/logo.png' }],
                events: [{ numEntrants: 16, entrantSizeMax: 32 }]
              }
            ]
          }
        }
      }
    });

    const res = await getUpcomingTournamentsStartgg(936, 10);
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Test Cup #1');
    expect(res[0].url).toBe('https://start.gg/tournament/test-cup-1');
    expect(res[0].participants_raw).toBe('16/32');
    expect(res[0].participants).toBe(16);
    expect(res[0].image_url).toBe('https://example.com/logo.png');
  });
});

import { apiService } from '../api';

// Mock do fetch global
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
          token: 'mock-jwt-token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await apiService.login('test@example.com', 'password123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockErrorResponse,
      } as Response);

      await expect(
        apiService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        apiService.login('test@example.com', 'password123')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Agents', () => {
    it('should fetch agents successfully', async () => {
      const mockAgents = {
        success: true,
        data: [
          { id: '1', name: 'Agent 1', description: 'Test agent' },
          { id: '2', name: 'Agent 2', description: 'Another agent' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgents,
      } as Response);

      const result = await apiService.getAgents();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          })
        })
      );

      expect(result).toEqual(mockAgents);
    });

    it('should create agent successfully', async () => {
      const newAgent = {
        name: 'New Agent',
        description: 'Test description',
        ai_provider: 'chatgpt',
        model: 'gpt-3.5-turbo'
      };

      const mockResponse = {
        success: true,
        data: { id: '3', ...newAgent }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await apiService.createAgent(newAgent);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agents',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newAgent)
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
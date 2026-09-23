using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Infrastructure.Push;

public class ExpoPushSender : IPushSender
{
    private const int BatchSize = 100;

    private readonly HttpClient _httpClient;
    private readonly ILogger<ExpoPushSender> _logger;

    public ExpoPushSender(HttpClient httpClient, ILogger<ExpoPushSender> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task SendAsync(IReadOnlyCollection<string> tokens, PushMessage message, CancellationToken cancellationToken)
    {
        foreach (var batch in tokens.Chunk(BatchSize))
        {
            var payload = batch.Select(token => new
            {
                to = token,
                title = message.Title,
                body = message.Body,
                data = message.Data,
                sound = "default",
                channelId = "messages",
                priority = "high",
            });

            try
            {
                using var response = await _httpClient.PostAsJsonAsync("/--/api/v2/push/send", payload, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    var detail = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogWarning("Expo push send returned {StatusCode}: {Detail}", (int)response.StatusCode, detail);
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                _logger.LogWarning(ex, "Expo push send failed for {Count} tokens", batch.Length);
            }
        }
    }
}

using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Infrastructure.Email;

public class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly string _fromAddress;

    public ResendEmailSender(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        var apiKey = configuration["Resend:ApiKey"] ?? throw new InvalidOperationException("Resend:ApiKey is not configured.");
        _fromAddress = configuration["Resend:FromAddress"] ?? throw new InvalidOperationException("Resend:FromAddress is not configured.");

        _httpClient.BaseAddress = new Uri("https://api.resend.com/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
    }

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.PostAsJsonAsync("emails", new
            {
                from = _fromAddress,
                to = new[] { toEmail },
                subject,
                html = htmlBody,
            }, cancellationToken);

            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            throw new EmailDeliveryException("Failed to send email via Resend.", ex);
        }
    }
}
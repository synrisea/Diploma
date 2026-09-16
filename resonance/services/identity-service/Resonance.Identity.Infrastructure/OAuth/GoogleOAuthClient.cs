using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Infrastructure.OAuth;

public class GoogleOAuthClient : IGoogleOAuthClient
{
    private readonly HttpClient _httpClient;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _redirectUri;

    public GoogleOAuthClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _clientId = configuration["Google:ClientId"] ?? throw new InvalidOperationException("Google:ClientId is not configured.");
        _clientSecret = configuration["Google:ClientSecret"] ?? throw new InvalidOperationException("Google:ClientSecret is not configured.");
        _redirectUri = configuration["Google:RedirectUri"] ?? throw new InvalidOperationException("Google:RedirectUri is not configured.");
    }

    public string BuildAuthorizationUrl(string state)
    {
        var scope = Uri.EscapeDataString("openid email profile");
        var redirectUri = Uri.EscapeDataString(_redirectUri);
        var encodedState = Uri.EscapeDataString(state);

        return "https://accounts.google.com/o/oauth2/v2/auth" +
            $"?client_id={_clientId}&redirect_uri={redirectUri}&response_type=code" +
            $"&scope={scope}&state={encodedState}&access_type=online&prompt=select_account";
    }

    public async Task<GoogleUserInfo> ExchangeCodeAsync(string code, CancellationToken cancellationToken)
    {
        var tokenResponse = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _clientId,
            ["client_secret"] = _clientSecret,
            ["redirect_uri"] = _redirectUri,
            ["grant_type"] = "authorization_code",
        }), cancellationToken);

        if (!tokenResponse.IsSuccessStatusCode)
            throw new InvalidOperationException("Failed to exchange authorization code with Google.");

        var tokenPayload = await tokenResponse.Content.ReadFromJsonAsync<GoogleTokenResponse>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Empty token response from Google.");

        var tokenInfoResponse = await _httpClient.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(tokenPayload.IdToken)}", cancellationToken);

        if (!tokenInfoResponse.IsSuccessStatusCode)
            throw new InvalidOperationException("Failed to validate Google ID token.");

        var info = await tokenInfoResponse.Content.ReadFromJsonAsync<GoogleTokenInfo>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Empty token info response from Google.");

        if (info.Aud != _clientId)
            throw new InvalidOperationException("Google ID token audience mismatch.");
        if (info.EmailVerified != "true")
            throw new InvalidOperationException("Google account email is not verified.");

        return new GoogleUserInfo(info.Sub, info.Email, info.Name ?? info.Email);
    }

    private record GoogleTokenResponse([property: JsonPropertyName("id_token")] string IdToken);

    private record GoogleTokenInfo(
        string Sub,
        string Email,
        [property: JsonPropertyName("email_verified")] string EmailVerified,
        string Aud,
        string? Name);
}
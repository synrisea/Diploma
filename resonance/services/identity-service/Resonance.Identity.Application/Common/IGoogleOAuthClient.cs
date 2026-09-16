namespace Resonance.Identity.Application.Common;

public record GoogleUserInfo(string ProviderUserId, string Email, string DisplayName);

public interface IGoogleOAuthClient
{
    string BuildAuthorizationUrl(string state);
    Task<GoogleUserInfo> ExchangeCodeAsync(string code, CancellationToken cancellationToken);
}
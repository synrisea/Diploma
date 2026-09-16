using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using Resonance.Identity.Api.Contracts;
using Resonance.Identity.Application;
using Resonance.Identity.Application.Auth;
using Resonance.Identity.Application.Auth.GoogleSignIn;
using Resonance.Identity.Application.Auth.Login;
using Resonance.Identity.Application.Auth.Refresh;
using Resonance.Identity.Application.Auth.Register;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Application.Profile.GetMe;
using Resonance.Identity.Application.Profile.UpdateProfile;
using Resonance.Identity.Application.Profile.UploadAvatar;
using Resonance.Identity.Application.Sessions.GetSessions;
using Resonance.Identity.Application.Sessions.RevokeOtherSessions;
using Resonance.Identity.Application.Sessions.RevokeSession;
using Resonance.Identity.Application.Users.GetByIds;
using Resonance.Identity.Application.Profile.DeleteAvatar;
using Resonance.Identity.Application.EmailChange.StartEmailChange;
using Resonance.Identity.Application.EmailChange.ConfirmEmailChange;
using Resonance.Identity.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddDataProtection();
builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = jwtSection["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();
var app = builder.Build();

app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

static bool TryGetUserId(ClaimsPrincipal user, out Guid userId)
{
    var claim = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
    return Guid.TryParse(claim, out userId);
}

static Guid? TryGetSessionId(ClaimsPrincipal user)
{
    var claim = user.FindFirstValue("sid");
    return Guid.TryParse(claim, out var sessionId) ? sessionId : null;
}

static string GoogleHandoffCacheKey(string code) => $"google-handoff:{code}";

static (string? DeviceLabel, string? IpAddress) GetClientInfo(HttpContext httpContext)
{
    var userAgent = httpContext.Request.Headers.UserAgent.ToString();
    var deviceLabel = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent[..Math.Min(userAgent.Length, 200)];
    var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString();

    return (deviceLabel, ipAddress);
}

app.MapPost("/api/auth/register", async (
    RegisterRequest request, HttpContext httpContext, IMediator mediator, CancellationToken cancellationToken) =>
{
    var (deviceLabel, ipAddress) = GetClientInfo(httpContext);

    try
    {
        var command = new RegisterCommand(request.Email, request.Password, request.DisplayName, deviceLabel, ipAddress);
        var result = await mediator.Send(command, cancellationToken);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { message = ex.Message });
    }
});

app.MapPost("/api/auth/login", async (
    LoginRequest request, HttpContext httpContext, IMediator mediator, CancellationToken cancellationToken) =>
{
    var (deviceLabel, ipAddress) = GetClientInfo(httpContext);

    try
    {
        var command = new LoginCommand(request.Email, request.Password, deviceLabel, ipAddress);
        var result = await mediator.Send(command, cancellationToken);
        return Results.Ok(result);
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Unauthorized();
    }
});

app.MapPost("/api/auth/refresh", async (
    RefreshRequest request, HttpContext httpContext, IMediator mediator, CancellationToken cancellationToken) =>
{
    var (deviceLabel, ipAddress) = GetClientInfo(httpContext);

    try
    {
        var command = new RefreshTokenCommand(request.RefreshToken, deviceLabel, ipAddress);
        var result = await mediator.Send(command, cancellationToken);
        return Results.Ok(result);
    }
    catch (UnauthorizedAccessException)
    {
        return Results.Unauthorized();
    }
});

app.MapGet("/api/identity/me", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    var result = await mediator.Send(new GetMeQuery(userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPatch("/api/identity/me", async (
    UpdateProfileRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    try
    {
        await mediator.Send(new UpdateProfileCommand(userId, request.DisplayName, request.PreferencesJson), cancellationToken);
        return Results.NoContent();
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization();

app.MapGet("/api/identity/sessions", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    var result = await mediator.Send(new GetSessionsQuery(userId, TryGetSessionId(user)), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapDelete("/api/identity/sessions/{sessionId:guid}", async (
    Guid sessionId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    await mediator.Send(new RevokeSessionCommand(userId, sessionId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/identity/sessions", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId))
        return Results.Unauthorized();

    var currentSessionId = TryGetSessionId(user);
    if (currentSessionId is null)
        return Results.BadRequest(new { error = "Current session could not be determined." });

    await mediator.Send(new RevokeOtherSessionsCommand(userId, currentSessionId.Value), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/identity/users", async (
    Guid[] ids, IMediator mediator, CancellationToken cancellationToken) =>
{
    var result = await mediator.Send(new GetUsersByIdsQuery(ids), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPut("/api/identity/me/avatar", async(
    IFormFile file, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    try
    {
        await using var stream = file.OpenReadStream();
        var url = await mediator.Send(new UploadAvatarCommand(userId, stream, file.ContentType, file.Length), cancellationToken);
        return Results.Ok(new { avatarUrl = url });
    }
    catch(ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { error = ex.Message });
    }
}).RequireAuthorization().DisableAntiforgery();

app.MapDelete("/api/identity/me/avatar", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new DeleteAvatarCommand(userId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapPost("/api/identity/me/email", async (
    StartEmailChangeRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    try
    {
        await mediator.Send(new StartEmailChangeCommand(userId, request.NewEmail), cancellationToken);
        return Results.NoContent();
    }
    catch (InvalidOperationException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization();

app.MapGet("/api/identity/email-change/confirm", async (
    string token, IMediator mediator, CancellationToken cancellationToken) =>
{
    try
    {
        var fullyConfirmed = await mediator.Send(new ConfirmEmailChangeCommand(token), cancellationToken);
        var message = fullyConfirmed
            ? "Email address updated. You can close this tab."
            : "Confirmed. Waiting on the other address to confirm too.";
        return Results.Content($"<html><body><p>{message}</p></body></html>", "text/html");
    }
    catch (InvalidOperationException ex)
    {
        return Results.Content($"<html><body><p>{ex.Message}</p></body></html>", "text/html", statusCode: 400);
    }
});

app.MapGet("/api/auth/google/start", (IDataProtectionProvider dataProtectionProvider, IGoogleOAuthClient googleClient) =>
{
    var protector = dataProtectionProvider.CreateProtector("GoogleOAuthState");
    var state = protector.Protect(DateTime.UtcNow.ToString("O"));
    return Results.Redirect(googleClient.BuildAuthorizationUrl(state));
});

app.MapGet("/api/auth/google/callback", async (
    string code, string state, HttpContext httpContext, IDataProtectionProvider dataProtectionProvider,
    IGoogleOAuthClient googleClient, IMediator mediator, IMemoryCache memoryCache, CancellationToken cancellationToken) =>
{
    var frontendBaseUrl = builder.Configuration["Identity:FrontendBaseUrl"]
        ?? throw new InvalidOperationException("Identity:FrontendBaseUrl is not configured.");
    var protector = dataProtectionProvider.CreateProtector("GoogleOAuthState");

    try
    {
        var issuedAt = DateTime.Parse(protector.Unprotect(state), null, System.Globalization.DateTimeStyles.RoundtripKind);
        if (DateTime.UtcNow - issuedAt > TimeSpan.FromMinutes(10))
            return Results.Redirect($"{frontendBaseUrl}/auth/callback?error={Uri.EscapeDataString("This sign-in link has expired. Please try again.")}");
    }
    catch
    {
        return Results.Redirect($"{frontendBaseUrl}/auth/callback?error={Uri.EscapeDataString("Invalid sign-in state.")}");
    }

    try
    {
        var googleUser = await googleClient.ExchangeCodeAsync(code, cancellationToken);
        var (deviceLabel, ipAddress) = GetClientInfo(httpContext);

        var result = await mediator.Send(
            new GoogleSignInCommand(googleUser.ProviderUserId, googleUser.Email, googleUser.DisplayName, deviceLabel, ipAddress),
            cancellationToken);

        var handoffCode = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
        memoryCache.Set(GoogleHandoffCacheKey(handoffCode), result, TimeSpan.FromSeconds(60));

        return Results.Redirect($"{frontendBaseUrl}/auth/callback?code={handoffCode}");
    }
    catch (InvalidOperationException ex)
    {
        return Results.Redirect($"{frontendBaseUrl}/auth/callback?error={Uri.EscapeDataString(ex.Message)}");
    }
});

app.MapPost("/api/auth/google/exchange", (GoogleExchangeRequest request, IMemoryCache memoryCache) =>
{
    if (!memoryCache.TryGetValue(GoogleHandoffCacheKey(request.Code), out AuthResponseDto? result) || result is null)
        return Results.BadRequest(new { error = "This sign-in link has expired or was already used. Please try again." });

    memoryCache.Remove(GoogleHandoffCacheKey(request.Code));
    return Results.Ok(result);
});

app.Run();

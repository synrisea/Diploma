using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Resonance.Identity.Api.Contracts;
using Resonance.Identity.Application;
using Resonance.Identity.Application.Auth.Login;
using Resonance.Identity.Application.Auth.Refresh;
using Resonance.Identity.Application.Auth.Register;
using Resonance.Identity.Application.Profile.GetMe;
using Resonance.Identity.Application.Profile.UpdateProfile;
using Resonance.Identity.Application.Sessions.GetSessions;
using Resonance.Identity.Application.Sessions.RevokeOtherSessions;
using Resonance.Identity.Application.Sessions.RevokeSession;
using Resonance.Identity.Application.Users.GetByIds;
using Resonance.Identity.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

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

app.Run();

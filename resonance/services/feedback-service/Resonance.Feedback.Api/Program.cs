using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Resonance.Feedback.Api.Contracts;
using Resonance.Feedback.Application;
using Resonance.Feedback.Application.Feedback.GetComments;
using Resonance.Feedback.Application.Feedback.Submit;
using Resonance.Feedback.Infrastructure;
using Scalar.AspNetCore;
using System.IdentityModel.Tokens.Jwt;

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

app.MapPost("/api/feedback", async (
    SubmitFeedbackRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    var userIdClaim = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var command = new SubmitQuickFeedbackCommand(request.PlaceId, userId, request.Comment);
    var id = await mediator.Send(command, cancellationToken);
    return Results.Created($"/api/feedback/{id}", new { id });
}).RequireAuthorization();

app.MapGet("/api/feedback/places/{placeId:guid}/comments", async (
    Guid placeId, int? limit, IMediator mediator, CancellationToken cancellationToken) =>
{
    var result = await mediator.Send(new GetCommentsForPlaceQuery(placeId, limit ?? 50), cancellationToken);
    return Results.Ok(result);
});

app.Run();
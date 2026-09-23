using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Resonance.Connections.Api.Contracts;
using Resonance.Connections.Application;
using Resonance.Connections.Application.Blocks.CreateBlock;
using Resonance.Connections.Application.Blocks.DeleteBlock;
using Resonance.Connections.Application.Blocks.GetBlockStatus;
using Resonance.Connections.Application.Conversations.CreateConversation;
using Resonance.Connections.Application.Conversations.GetConversations;
using Resonance.Connections.Application.Conversations.GetMessages;
using Resonance.Connections.Application.Conversations.MarkRead;
using Resonance.Connections.Application.Conversations.SendMessage;
using Resonance.Connections.Application.Devices.RegisterDevice;
using Resonance.Connections.Application.Devices.UnregisterDevice;
using Resonance.Connections.Application.FriendRequests.AcceptFriendRequest;
using Resonance.Connections.Application.FriendRequests.DeclineFriendRequest;
using Resonance.Connections.Application.FriendRequests.GetFriendRequests;
using Resonance.Connections.Application.FriendRequests.SendFriendRequest;
using Resonance.Connections.Application.Friends.GetFriends;
using Resonance.Connections.Application.Friends.RemoveFriend;
using Resonance.Connections.Application.Intents.CreateIntent;
using Resonance.Connections.Application.Intents.DeleteIntent;
using Resonance.Connections.Application.Intents.GetIntents;
using Resonance.Connections.Application.Intents.GetMyIntents;
using Resonance.Connections.Infrastructure;
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

app.MapPost("/api/connections/intents", async (
    CreateIntentRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    try
    {
        var id = await mediator.Send(new CreateIntentCommand(userId, request.PlaceId, request.VisitDate, request.IntentTag), cancellationToken);
        return Results.Ok(new { id });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization();

app.MapGet("/api/connections/intents", async (
    Guid placeId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetIntentsForPlaceQuery(placeId, userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapGet("/api/connections/intents/mine", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetMyIntentsQuery(userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapDelete("/api/connections/intents/{intentId:guid}", async (
    Guid intentId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new DeleteIntentCommand(intentId, userId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapPost("/api/connections/conversations", async (
    CreateConversationRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    try
    {
        var id = await mediator.Send(new CreateConversationCommand(userId, request.RecipientUserId, request.InitialMessage, request.VisitIntentId), cancellationToken);
        return Results.Ok(new { conversationId = id });
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

app.MapGet("/api/connections/conversations", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetConversationsQuery(userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapGet("/api/connections/conversations/{conversationId:guid}/messages", async (
    Guid conversationId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetMessagesQuery(conversationId, userId), cancellationToken);
    return result is null ? Results.NotFound() : Results.Ok(result);
}).RequireAuthorization();

app.MapPost("/api/connections/conversations/{conversationId:guid}/messages", async (
    Guid conversationId, SendMessageRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var outcome = await mediator.Send(new SendMessageCommand(conversationId, userId, request.Body), cancellationToken);
    return outcome.Status switch
    {
        SendMessageStatus.Sent => Results.Ok(outcome.Message),
        SendMessageStatus.NotFound => Results.NotFound(),
        SendMessageStatus.Forbidden => Results.Forbid(),
        SendMessageStatus.Blocked => Results.Conflict(new { error = "Messaging isn't available between these two accounts." }),
        _ => Results.Problem(),
    };
}).RequireAuthorization();

app.MapPost("/api/connections/conversations/{conversationId:guid}/read", async (
    Guid conversationId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new MarkConversationReadCommand(conversationId, userId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/connections/blocks/status", async (
    [Microsoft.AspNetCore.Mvc.FromQuery(Name = "userId")] Guid otherUserId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var callerId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetBlockStatusQuery(callerId, otherUserId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPost("/api/connections/blocks", async (
    BlockUserRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new CreateBlockCommand(userId, request.BlockedUserId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/connections/blocks/{blockedUserId:guid}", async (
    Guid blockedUserId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new DeleteBlockCommand(userId, blockedUserId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapPost("/api/connections/friend-requests", async (
    SendFriendRequestRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    try
    {
        var outcome = await mediator.Send(new SendFriendRequestCommand(userId, request.RecipientUserId), cancellationToken);
        return outcome.Status switch
        {
            SendFriendRequestStatus.Sent => Results.Ok(new { requestId = outcome.RequestId }),
            SendFriendRequestStatus.AlreadyPending => Results.Conflict(new { error = "A friend request is already pending between you two." }),
            SendFriendRequestStatus.AlreadyFriends => Results.Conflict(new { error = "You're already friends." }),
            SendFriendRequestStatus.Blocked => Results.Conflict(new { error = "Friend requests aren't available between these two accounts." }),
            _ => Results.Problem(),
        };
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
}).RequireAuthorization();

app.MapGet("/api/connections/friend-requests", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetFriendRequestsQuery(userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPost("/api/connections/friend-requests/{requestId:guid}/accept", async (
    Guid requestId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var status = await mediator.Send(new AcceptFriendRequestCommand(requestId, userId), cancellationToken);
    return status switch
    {
        AcceptFriendRequestStatus.Accepted => Results.NoContent(),
        AcceptFriendRequestStatus.NotFound => Results.NotFound(),
        AcceptFriendRequestStatus.Forbidden => Results.Forbid(),
        _ => Results.Problem(),
    };
}).RequireAuthorization();

app.MapPost("/api/connections/friend-requests/{requestId:guid}/decline", async (
    Guid requestId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var status = await mediator.Send(new DeclineFriendRequestCommand(requestId, userId), cancellationToken);
    return status switch
    {
        DeclineFriendRequestStatus.Declined => Results.NoContent(),
        DeclineFriendRequestStatus.NotFound => Results.NotFound(),
        DeclineFriendRequestStatus.Forbidden => Results.Forbid(),
        _ => Results.Problem(),
    };
}).RequireAuthorization();

app.MapDelete("/api/connections/friends/{friendUserId:guid}", async (
    Guid friendUserId, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new RemoveFriendCommand(userId, friendUserId), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/connections/friends", async (
    ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    var result = await mediator.Send(new GetFriendsQuery(userId), cancellationToken);
    return Results.Ok(result);
}).RequireAuthorization();

app.MapPut("/api/connections/devices", async (
    RegisterDeviceRequest request, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();
    if (string.IsNullOrWhiteSpace(request.Token)) return Results.BadRequest(new { error = "A push token is required." });

    await mediator.Send(new RegisterDeviceCommand(userId, request.Token, request.Platform ?? string.Empty), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/connections/devices/{token}", async (
    string token, ClaimsPrincipal user, IMediator mediator, CancellationToken cancellationToken) =>
{
    if (!TryGetUserId(user, out var userId)) return Results.Unauthorized();

    await mediator.Send(new UnregisterDeviceCommand(userId, token), cancellationToken);
    return Results.NoContent();
}).RequireAuthorization();

app.Run();

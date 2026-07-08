using MediatR;
using Resonance.Places.Application;
using Resonance.Places.Application.Places.GetPlacesInBoundingBox;
using Resonance.Places.Infrastructure;
using Scalar.AspNetCore;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapGet("/api/places", async(
    double minLat, double minLng, double maxLat, double maxLng,
    IMediator mediator, CancellationToken cancellationToken) =>
    {
        var result = await mediator.Send(new GetPlacesInBoundingBoxQuery(minLat, minLng, maxLat, maxLng), cancellationToken);
        return Results.Ok(result);
    }
);

app.UseHttpsRedirection();

app.Run();
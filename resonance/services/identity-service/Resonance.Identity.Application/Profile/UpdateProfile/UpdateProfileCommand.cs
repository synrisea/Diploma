using MediatR;

namespace Resonance.Identity.Application.Profile.UpdateProfile;

public record UpdateProfileCommand(Guid UserId, string? DisplayName, string? PreferencesJson) : IRequest;
using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Resonance.Connections.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddConversationReadTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "UserALastReadAt",
                table: "Conversations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UserBLastReadAt",
                table: "Conversations",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UserALastReadAt",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "UserBLastReadAt",
                table: "Conversations");
        }
    }
}

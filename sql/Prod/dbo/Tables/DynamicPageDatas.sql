﻿CREATE TABLE [dbo].[DynamicPageDatas] (
    [Id]            INT            IDENTITY (1, 1) NOT NULL,
    [DynamicPageId] INT            NOT NULL,
    [DataName]      NVARCHAR (MAX) NOT NULL,
    [DataType]      NVARCHAR (MAX) NOT NULL,
    [DataValue]     NVARCHAR (MAX) NOT NULL,
    CONSTRAINT [PK_dbo.DynamicPageDatas] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_dbo.DynamicPageDatas_dbo.DynamicPages_DynamicPageId] FOREIGN KEY ([DynamicPageId]) REFERENCES [dbo].[DynamicPages] ([Id]) ON DELETE CASCADE
);


GO
CREATE NONCLUSTERED INDEX [IX_DynamicPageId]
    ON [dbo].[DynamicPageDatas]([DynamicPageId] ASC);

